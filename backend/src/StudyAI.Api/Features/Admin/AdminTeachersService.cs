using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Admin;

public class AdminTeachersService : IAdminTeachersService
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public AdminTeachersService(
        IApplicationDbContext db,
        IPasswordHasher passwordHasher,
        IAuditWriter auditWriter,
        IClock clock,
        IIdGenerator idGenerator)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _auditWriter = auditWriter;
        _clock = clock;
        _idGenerator = idGenerator;
    }

    private static bool TryMapTeacherStatus(string rawStatus, out string userStatus)
    {
        userStatus = rawStatus.Trim().ToLowerInvariant() switch
        {
            "active" => "active",
            "inactive" => "disabled",
            "pending" => "suspended",
            "suspended" => "suspended",
            "disabled" => "disabled",
            _ => string.Empty
        };
        return !string.IsNullOrEmpty(userStatus);
    }

    public async Task<List<AdminTeacherDto>> GetTeachersAsync(string? search = null, string? status = null, string? subject = null, CancellationToken ct = default)
    {
        var query = _db.Users.Where(u => u.Role == "teacher" && !u.IsDeleted);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u =>
                (u.DisplayName != null && u.DisplayName.ToLower().Contains(s)) ||
                (u.Email != null && u.Email.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            var raw = status.Trim().ToLowerInvariant();
            if (raw == "inactive")
            {
                query = query.Where(u => u.Status == "disabled");
            }
            else if (raw == "pending")
            {
                query = query.Where(u => u.Status == "suspended" || u.Status == "pending");
            }
            else if (raw == "active")
            {
                query = query.Where(u => u.Status == "active");
            }
            else if (TryMapTeacherStatus(raw, out var mappedStatus))
            {
                query = query.Where(u => u.Status == mappedStatus);
            }
            else
            {
                query = query.Where(u => u.Status == status);
            }
        }

        var teachers = await query.OrderBy(u => u.DisplayName).ToListAsync(ct);
        var teacherIds = teachers.Select(t => t.Id).ToList();

        var dbProfiles = await _db.TeacherProfiles
            .Where(p => teacherIds.Contains(p.TeacherId))
            .ToDictionaryAsync(p => p.TeacherId, ct);

        var classrooms = await _db.Classrooms
            .Where(c => teacherIds.Contains(c.TeacherId) && c.Status != "archived")
            .ToListAsync(ct);

        var classroomIds = classrooms.Select(c => c.Id).ToList();
        var studentCounts = await _db.ClassroomStudents
            .Where(cs => classroomIds.Contains(cs.ClassroomId))
            .GroupBy(cs => cs.ClassroomId)
            .Select(g => new { ClassroomId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ClassroomId, x => x.Count, ct);

        var result = new List<AdminTeacherDto>();
        foreach (var t in teachers)
        {
            var teacherClasses = classrooms.Where(c => c.TeacherId == t.Id).ToList();
            var classNames = teacherClasses.Select(c => c.Name).ToList();
            var totalStudents = teacherClasses.Sum(c => studentCounts.GetValueOrDefault(c.Id, 0));

            dbProfiles.TryGetValue(t.Id, out var profile);

            var phone = profile?.Phone ?? "";
            var qualifications = profile?.Qualifications ?? "";
            var experienceYears = profile?.ExperienceYears ?? 0;
            var bio = profile?.Bio ?? "";

            var teacherSubject = !string.IsNullOrWhiteSpace(t.Grade) ? $"Toán học {t.Grade}" : "Toán học 12";
            if (!string.IsNullOrWhiteSpace(subject) && subject != "all" && !teacherSubject.ToLower().Contains(subject.ToLower()))
            {
                continue;
            }

            var uiStatus = t.Status switch
            {
                "active" => "active",
                "disabled" => "inactive",
                "suspended" => "pending",
                _ => t.Status ?? "active"
            };

            var accountStatus = (t.Status == "suspended" || t.Status == "disabled") ? "LOCKED" : "ACTIVE";

            result.Add(new AdminTeacherDto
            {
                Id = t.Id,
                Name = t.DisplayName ?? t.Email ?? "",
                Email = t.Email ?? "",
                Phone = phone,
                Subject = teacherSubject,
                Classes = classNames,
                StudentCount = totalStudents,
                Status = uiStatus,
                JoinedAt = t.CreatedAt.ToString("o"),
                Rating = 5.0,
                Qualifications = qualifications,
                ExperienceYears = experienceYears,
                Bio = bio,
                AccountStatus = accountStatus
            });
        }

        return result;
    }

    public async Task<TeacherKpisDto> GetTeacherKpisAsync(CancellationToken ct = default)
    {
        var thirtyDaysAgo = _clock.UtcNow.AddDays(-30);
        var teachers = await _db.Users
            .Where(u => u.Role == "teacher" && !u.IsDeleted)
            .ToListAsync(ct);

        return new TeacherKpisDto
        {
            TotalTeachers = teachers.Count,
            ActiveTeaching = teachers.Count(t => t.Status == "active"),
            PendingOrLeave = teachers.Count(t => t.Status != "active"),
            NewTeachers = teachers.Count(t => t.CreatedAt >= thirtyDaysAgo)
        };
    }

    public async Task<AdminTeacherDto> CreateTeacherAsync(SaveTeacherRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
            throw new ValidationException("Email", "Định dạng email giáo viên không hợp lệ.");
        if (string.IsNullOrWhiteSpace(req.Name))
            throw new ValidationException("Name", "Vui lòng nhập họ tên giáo viên.");

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var existing = await _db.Users.AnyAsync(u => u.EmailNormalized == normalizedEmail && !u.IsDeleted, ct);
        if (existing)
            throw new ConflictException("Email đã được sử dụng.");

        string rawPassword;
        if (!string.IsNullOrWhiteSpace(req.Password))
        {
            if (req.Password.Trim().Length < 8 || req.Password.Length > 128)
                throw new ValidationException("Password", "Mật khẩu phải chứa ít nhất 8 ký tự và không vượt quá 128 ký tự.");
            rawPassword = req.Password.Trim();
        }
        else
        {
            rawPassword = GenerateSecurePassword();
        }

        string initialStatus = "active";
        if (!string.IsNullOrWhiteSpace(req.AccountStatus) && req.AccountStatus.Trim().Equals("LOCKED", StringComparison.OrdinalIgnoreCase))
        {
            initialStatus = "suspended";
        }
        else if (!string.IsNullOrWhiteSpace(req.Status))
        {
            if (!TryMapTeacherStatus(req.Status, out initialStatus))
            {
                throw new ValidationException("Status", $"Trạng thái giáo viên không hợp lệ: '{req.Status}'. Cho phép: active, pending, inactive, suspended, disabled.");
            }
        }

        var newTeacher = new User
        {
            Id = _idGenerator.NewId("tch"),
            Email = req.Email.Trim(),
            EmailNormalized = normalizedEmail,
            PasswordHash = _passwordHasher.HashPassword(rawPassword),
            DisplayName = req.Name.Trim(),
            Role = "teacher",
            Grade = req.Subject.Replace("Toán học", "").Trim(),
            Status = initialStatus,
            IsDeleted = false,
            CreatedAt = _clock.UtcNow,
            UpdatedAt = _clock.UtcNow
        };
        _db.Users.Add(newTeacher);

        var newProfile = new TeacherProfile
        {
            Id = _idGenerator.NewId("tp"),
            TeacherId = newTeacher.Id,
            Phone = req.Phone?.Trim(),
            Qualifications = req.Qualifications?.Trim(),
            ExperienceYears = req.ExperienceYears ?? 0,
            Bio = req.Bio?.Trim(),
            CreatedAt = _clock.UtcNow,
            UpdatedAt = _clock.UtcNow
        };
        _db.TeacherProfiles.Add(newProfile);

        await _db.SaveChangesAsync(ct);

        await _auditWriter.WriteStaffAuditAsync(
            "teacher_created",
            "teacher",
            newTeacher.Id,
            null,
            JsonSerializer.Serialize(new { email = newTeacher.Email, name = newTeacher.DisplayName, subject = req.Subject }),
            ct);

        return new AdminTeacherDto
        {
            Id = newTeacher.Id,
            Name = newTeacher.DisplayName,
            Email = newTeacher.Email,
            Phone = newProfile.Phone ?? string.Empty,
            Subject = req.Subject,
            Classes = req.Classes ?? new List<string>(),
            StudentCount = 0,
            Status = newTeacher.Status,
            JoinedAt = newTeacher.CreatedAt.ToString("o"),
            Rating = 5.0,
            Qualifications = newProfile.Qualifications ?? string.Empty,
            ExperienceYears = newProfile.ExperienceYears,
            Bio = newProfile.Bio ?? string.Empty,
            AccountStatus = (newTeacher.Status == "suspended" || newTeacher.Status == "disabled") ? "LOCKED" : "ACTIVE",
            TemporaryPassword = rawPassword
        };
    }

    public async Task<AdminTeacherDto> UpdateTeacherAsync(string id, SaveTeacherRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        var teacher = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == "teacher" && !u.IsDeleted, ct);
        if (teacher == null) throw new NotFoundException("Giáo viên", id);

        if (!string.IsNullOrWhiteSpace(req.Email))
        {
            var newEmail = req.Email.Trim().ToLowerInvariant();
            if (!newEmail.Contains('@'))
            {
                throw new ValidationException("Email", "Định dạng email giáo viên không hợp lệ.");
            }

            var duplicate = await _db.Users.AnyAsync(u => u.EmailNormalized == newEmail && u.Id != teacher.Id && !u.IsDeleted, ct);
            if (duplicate)
            {
                throw new ConflictException("Email đã được sử dụng bởi tài khoản khác.");
            }

            teacher.Email = req.Email.Trim();
            teacher.EmailNormalized = newEmail;
        }

        if (!string.IsNullOrWhiteSpace(req.AccountStatus))
        {
            var accStatus = req.AccountStatus.Trim().ToUpperInvariant();
            if (accStatus == "LOCKED")
            {
                teacher.Status = "suspended";
            }
            else if (accStatus == "ACTIVE")
            {
                teacher.Status = "active";
            }
            else
            {
                throw new ValidationException("AccountStatus", $"AccountStatus không hợp lệ: '{req.AccountStatus}'. Cho phép: ACTIVE, LOCKED.");
            }
        }
        else if (!string.IsNullOrWhiteSpace(req.Status))
        {
            if (!TryMapTeacherStatus(req.Status, out var mappedStatus))
            {
                throw new ValidationException("Status", $"Trạng thái giảng dạy không hợp lệ: '{req.Status}'. Cho phép: active, pending, inactive, suspended, disabled.");
            }
            teacher.Status = mappedStatus;
        }

        if (!string.IsNullOrWhiteSpace(req.Name)) teacher.DisplayName = req.Name.Trim();
        if (!string.IsNullOrWhiteSpace(req.Subject)) teacher.Grade = req.Subject.Replace("Toán học", "").Trim();
        teacher.UpdatedAt = _clock.UtcNow;

        var profile = await _db.TeacherProfiles.FirstOrDefaultAsync(p => p.TeacherId == teacher.Id, ct);
        if (profile == null)
        {
            profile = new TeacherProfile
            {
                Id = _idGenerator.NewId("tp"),
                TeacherId = teacher.Id,
                CreatedAt = _clock.UtcNow,
                UpdatedAt = _clock.UtcNow
            };
            _db.TeacherProfiles.Add(profile);
        }

        bool profileChanged = false;
        if (req.Phone != null)
        {
            profile.Phone = req.Phone.Trim();
            profileChanged = true;
        }
        if (req.Qualifications != null)
        {
            profile.Qualifications = req.Qualifications.Trim();
            profileChanged = true;
        }
        if (req.ExperienceYears.HasValue)
        {
            profile.ExperienceYears = req.ExperienceYears.Value;
            profileChanged = true;
        }
        if (req.Bio != null)
        {
            profile.Bio = req.Bio.Trim();
            profileChanged = true;
        }
        if (profileChanged)
        {
            profile.UpdatedAt = _clock.UtcNow;
        }

        await _db.SaveChangesAsync(ct);

        await _auditWriter.WriteStaffAuditAsync(
            "teacher_updated",
            "teacher",
            teacher.Id,
            null,
            JsonSerializer.Serialize(new { email = teacher.Email, name = teacher.DisplayName, status = teacher.Status }),
            ct);

        var teacherClasses = await _db.Classrooms
            .Where(c => c.TeacherId == teacher.Id && c.Status != "archived")
            .ToListAsync(ct);
        var classNames = teacherClasses.Select(c => c.Name).ToList();
        var teacherClassIds = teacherClasses.Select(c => c.Id).ToList();
        var totalStudents = await _db.ClassroomStudents
            .CountAsync(cs => teacherClassIds.Contains(cs.ClassroomId), ct);

        return new AdminTeacherDto
        {
            Id = teacher.Id,
            Name = teacher.DisplayName ?? teacher.Email ?? "",
            Email = teacher.Email ?? "",
            Phone = profile.Phone ?? "",
            Subject = !string.IsNullOrWhiteSpace(teacher.Grade) ? $"Toán học {teacher.Grade}" : "Toán học 12",
            Classes = classNames,
            StudentCount = totalStudents,
            Status = teacher.Status == "active" ? "active" : teacher.Status == "disabled" ? "inactive" : "pending",
            JoinedAt = teacher.CreatedAt.ToString("o"),
            Rating = 5.0,
            Qualifications = profile.Qualifications ?? "",
            ExperienceYears = profile.ExperienceYears,
            Bio = profile.Bio ?? "",
            AccountStatus = (teacher.Status == "suspended" || teacher.Status == "disabled") ? "LOCKED" : "ACTIVE"
        };
    }

    public async Task<bool> DeleteTeacherAsync(string id, string currentUserId, CancellationToken ct = default)
    {
        var teacher = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == "teacher" && !u.IsDeleted, ct);
        if (teacher == null) throw new NotFoundException("Giáo viên", id);

        teacher.IsDeleted = true;
        teacher.DeletedAt = _clock.UtcNow;
        teacher.Status = "disabled";
        teacher.UpdatedAt = _clock.UtcNow;

        await _db.SaveChangesAsync(ct);

        await _auditWriter.WriteStaffAuditAsync(
            "teacher_deleted",
            "teacher",
            teacher.Id,
            null,
            JsonSerializer.Serialize(new { email = teacher.Email }),
            ct);

        return true;
    }

    private static string GenerateSecurePassword()
    {
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghijkmnopqrstuvwxyz";
        const string digits = "23456789";
        const string special = "!@#$%^&*";

        var chars = new char[12];
        chars[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
        chars[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
        chars[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
        chars[3] = special[RandomNumberGenerator.GetInt32(special.Length)];

        const string all = upper + lower + digits + special;
        for (int i = 4; i < chars.Length; i++)
        {
            chars[i] = all[RandomNumberGenerator.GetInt32(all.Length)];
        }

        RandomNumberGenerator.Shuffle(chars.AsSpan());
        return new string(chars);
    }
}