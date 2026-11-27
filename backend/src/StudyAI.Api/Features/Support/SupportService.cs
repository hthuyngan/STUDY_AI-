using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StudyAI.Common.Exceptions;

namespace StudyAI.Features.Support;

public class SupportService : ISupportService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    private static readonly HashSet<string> AllowedCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "ACCOUNT", "TECHNICAL", "AI_TUTOR", "LEARNING_CONTENT", "SUBSCRIPTION", "OTHER"
    };

    private static readonly HashSet<string> AllowedPriorities = new(StringComparer.OrdinalIgnoreCase)
    {
        "LOW", "MEDIUM", "HIGH", "URGENT"
    };

    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"
    };

    public SupportService(
        IApplicationDbContext db,
        IAuditWriter auditWriter,
        IClock clock,
        IIdGenerator idGenerator)
    {
        _db = db;
        _auditWriter = auditWriter;
        _clock = clock;
        _idGenerator = idGenerator;
    }

    public async Task<SupportTicketsPageDto> ListUserTicketsAsync(
        string userId,
        string? status = null,
        string? category = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        var query = _db.SupportTickets.Where(t => t.UserId == userId);
        return await ExecutePagedListAsync(query, status, category, null, null, null, page, pageSize, ct);
    }

    public async Task<SupportTicketDetailDto> GetUserTicketDetailAsync(
        string ticketId,
        string userId,
        CancellationToken ct = default)
    {
        var ticket = await _db.SupportTickets
            .Include(t => t.Messages.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(t => t.Id == ticketId, ct);

        if (ticket == null)
        {
            throw new NotFoundException("Yêu cầu hỗ trợ", ticketId);
        }

        if (!string.Equals(ticket.UserId, userId, StringComparison.Ordinal))
        {
            throw new ForbiddenException("Bạn không có quyền xem yêu cầu hỗ trợ của người dùng khác.");
        }

        return await BuildDetailDtoAsync(ticket, ct);
    }

    public async Task<SupportTicketDetailDto> CreateTicketAsync(
        string userId,
        CreateSupportTicketRequestDto req,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Subject) || req.Subject.Trim().Length < 3)
        {
            throw new ValidationException("Subject", "Tiêu đề yêu cầu phải có ít nhất 3 ký tự.");
        }

        if (req.Subject.Trim().Length > 200)
        {
            throw new ValidationException("Subject", "Tiêu đề yêu cầu không được vượt quá 200 ký tự.");
        }

        if (string.IsNullOrWhiteSpace(req.Message))
        {
            throw new ValidationException("Message", "Nội dung yêu cầu hỗ trợ không được để trống.");
        }

        if (req.Message.Trim().Length > 4000)
        {
            throw new ValidationException("Message", "Nội dung yêu cầu không được vượt quá 4000 ký tự.");
        }

        var category = (req.Category ?? "OTHER").Trim().ToUpperInvariant();
        if (!AllowedCategories.Contains(category))
        {
            throw new ValidationException("Category", $"Nhóm vấn đề '{req.Category}' không hợp lệ.");
        }

        var now = _clock.UtcNow;
        var ticketId = _idGenerator.NewId("tkt");
        var codeSuffix = ticketId.Length >= 6 ? ticketId[^6..].ToUpperInvariant() : ticketId.ToUpperInvariant();
        var ticket = new SupportTicket
        {
            Id = ticketId,
            TicketCode = $"TK-{now:yyyyMMdd}-{codeSuffix}",
            UserId = userId,
            Subject = req.Subject.Trim(),
            Category = category,
            Priority = "MEDIUM",
            Status = "OPEN",
            CreatedAt = now,
            UpdatedAt = now
        };

        var message = new SupportTicketMessage
        {
            Id = _idGenerator.NewId("tkm"),
            TicketId = ticketId,
            SenderUserId = userId,
            SenderRole = "user",
            Body = req.Message.Trim(),
            CreatedAt = now
        };

        _db.SupportTickets.Add(ticket);
        _db.SupportTicketMessages.Add(message);
        await _db.SaveChangesAsync(ct);

        if (!ticket.Messages.Any(m => m.Id == message.Id))
        {
            ticket.Messages.Add(message);
        }
        return await BuildDetailDtoAsync(ticket, ct);
    }

    public async Task<SupportTicketDetailDto> AddUserMessageAsync(
        string ticketId,
        string userId,
        ReplySupportTicketRequestDto req,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Body))
        {
            throw new ValidationException("Body", "Nội dung phản hồi không được để trống.");
        }

        if (req.Body.Trim().Length > 4000)
        {
            throw new ValidationException("Body", "Nội dung phản hồi không được vượt quá 4000 ký tự.");
        }

        var ticket = await _db.SupportTickets
            .Include(t => t.Messages.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(t => t.Id == ticketId, ct);

        if (ticket == null)
        {
            throw new NotFoundException("Yêu cầu hỗ trợ", ticketId);
        }

        if (!string.Equals(ticket.UserId, userId, StringComparison.Ordinal))
        {
            throw new ForbiddenException("Bạn không có quyền phản hồi yêu cầu hỗ trợ của người dùng khác.");
        }

        if (ticket.Status == "CLOSED")
        {
            throw new ValidationException("Status", "Yêu cầu hỗ trợ đã đóng, không thể gửi thêm tin nhắn.");
        }

        var now = _clock.UtcNow;
        var trimmedBody = req.Body.Trim();
        var clientMsgId = string.IsNullOrWhiteSpace(req.ClientMessageId) ? null : req.ClientMessageId.Trim();
        if (clientMsgId != null && clientMsgId.Length > 64)
        {
            throw new ValidationException("ClientMessageId", "ClientMessageId không được vượt quá 64 ký tự.");
        }

        if (clientMsgId != null)
        {
            var existing = await _db.SupportTicketMessages.AnyAsync(
                m => m.TicketId == ticket.Id && m.SenderUserId == userId && m.ClientMessageId == clientMsgId, ct);
            if (existing)
            {
                return await BuildDetailDtoAsync(ticket, ct);
            }
        }

        var message = new SupportTicketMessage
        {
            Id = _idGenerator.NewId("tkm"),
            TicketId = ticket.Id,
            SenderUserId = userId,
            SenderRole = "user",
            Body = trimmedBody,
            ClientMessageId = clientMsgId,
            CreatedAt = now
        };

        if (ticket.Status == "WAITING_FOR_USER" || ticket.Status == "RESOLVED")
        {
            ticket.Status = "OPEN";
            ticket.ResolvedAt = null;
        }
        ticket.UpdatedAt = now;

        _db.SupportTicketMessages.Add(message);
        await _db.SaveChangesAsync(ct);

        if (!ticket.Messages.Any(m => m.Id == message.Id))
        {
            ticket.Messages.Add(message);
        }
        return await BuildDetailDtoAsync(ticket, ct);
    }

    public async Task<SupportTicketsPageDto> ListAdminTicketsAsync(
        string? status = null,
        string? category = null,
        string? priority = null,
        string? search = null,
        string? assignedTo = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        var query = _db.SupportTickets.AsQueryable();
        return await ExecutePagedListAsync(query, status, category, priority, search, assignedTo, page, pageSize, ct);
    }

    public async Task<SupportTicketDetailDto> GetAdminTicketDetailAsync(
        string ticketId,
        CancellationToken ct = default)
    {
        var ticket = await _db.SupportTickets
            .Include(t => t.Messages.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(t => t.Id == ticketId, ct);

        if (ticket == null)
        {
            throw new NotFoundException("Yêu cầu hỗ trợ", ticketId);
        }

        return await BuildDetailDtoAsync(ticket, ct);
    }

    public async Task<SupportTicketDetailDto> UpdateTicketAdminAsync(
        string ticketId,
        AdminUpdateSupportTicketRequestDto req,
        string adminUserId,
        CancellationToken ct = default)
    {
        var ticket = await _db.SupportTickets
            .Include(t => t.Messages.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(t => t.Id == ticketId, ct);

        if (ticket == null)
        {
            throw new NotFoundException("Yêu cầu hỗ trợ", ticketId);
        }

        var beforeState = JsonSerializer.Serialize(new
        {
            status = ticket.Status,
            priority = ticket.Priority,
            category = ticket.Category,
            assignedToUserId = ticket.AssignedToUserId
        });

        var now = _clock.UtcNow;

        if (!string.IsNullOrWhiteSpace(req.Status))
        {
            var nextStatus = req.Status.Trim().ToUpperInvariant();
            if (!AllowedStatuses.Contains(nextStatus))
            {
                throw new ValidationException("Status", $"Trạng thái '{req.Status}' không hợp lệ.");
            }
            ApplyStatusTransition(ticket, nextStatus, now);
        }

        if (!string.IsNullOrWhiteSpace(req.Priority))
        {
            var nextPriority = req.Priority.Trim().ToUpperInvariant();
            if (!AllowedPriorities.Contains(nextPriority))
            {
                throw new ValidationException("Priority", $"Mức ưu tiên '{req.Priority}' không hợp lệ.");
            }
            ticket.Priority = nextPriority;
        }

        if (!string.IsNullOrWhiteSpace(req.Category))
        {
            var nextCategory = req.Category.Trim().ToUpperInvariant();
            if (!AllowedCategories.Contains(nextCategory))
            {
                throw new ValidationException("Category", $"Nhóm vấn đề '{req.Category}' không hợp lệ.");
            }
            ticket.Category = nextCategory;
        }

        if (req.AssignedToUserId != null)
        {
            if (string.IsNullOrWhiteSpace(req.AssignedToUserId))
            {
                ticket.AssignedToUserId = null;
            }
            else
            {
                var assigneeExists = await _db.Users.AnyAsync(
                    u => u.Id == req.AssignedToUserId && !u.IsDeleted && (u.Role == "admin" || u.Role == "support"), ct);
                if (!assigneeExists)
                {
                    throw new ValidationException("AssignedToUserId", "Người xử lý phải là tài khoản Admin hoặc Support đang hoạt động.");
                }
                ticket.AssignedToUserId = req.AssignedToUserId;
            }
        }

        ticket.UpdatedAt = now;
        await _db.SaveChangesAsync(ct);

        var afterState = JsonSerializer.Serialize(new
        {
            status = ticket.Status,
            priority = ticket.Priority,
            category = ticket.Category,
            assignedToUserId = ticket.AssignedToUserId
        });

        await _auditWriter.WriteStaffAuditAsync("admin_update_ticket", "support_ticket", ticket.Id, beforeState, afterState, ct);

        return await BuildDetailDtoAsync(ticket, ct);
    }

    public async Task<SupportTicketDetailDto> AddAdminMessageAsync(
        string ticketId,
        string adminUserId,
        string adminRole,
        ReplySupportTicketRequestDto req,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Body))
        {
            throw new ValidationException("Body", "Nội dung phản hồi không được để trống.");
        }

        if (req.Body.Trim().Length > 4000)
        {
            throw new ValidationException("Body", "Nội dung phản hồi không được vượt quá 4000 ký tự.");
        }

        var ticket = await _db.SupportTickets
            .Include(t => t.Messages.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(t => t.Id == ticketId, ct);

        if (ticket == null)
        {
            throw new NotFoundException("Yêu cầu hỗ trợ", ticketId);
        }

        var now = _clock.UtcNow;
        var clientMsgId = string.IsNullOrWhiteSpace(req.ClientMessageId) ? null : req.ClientMessageId.Trim();
        if (clientMsgId != null && clientMsgId.Length > 64)
        {
            throw new ValidationException("ClientMessageId", "ClientMessageId không được vượt quá 64 ký tự.");
        }

        if (clientMsgId != null)
        {
            var existing = await _db.SupportTicketMessages.AnyAsync(
                m => m.TicketId == ticket.Id && m.SenderUserId == adminUserId && m.ClientMessageId == clientMsgId, ct);
            if (existing)
            {
                return await BuildDetailDtoAsync(ticket, ct);
            }
        }

        var message = new SupportTicketMessage
        {
            Id = _idGenerator.NewId("tkm"),
            TicketId = ticket.Id,
            SenderUserId = adminUserId,
            SenderRole = adminRole,
            Body = req.Body.Trim(),
            ClientMessageId = clientMsgId,
            CreatedAt = now
        };

        if (!string.IsNullOrWhiteSpace(req.NextStatus))
        {
            var nextStatus = req.NextStatus.Trim().ToUpperInvariant();
            if (!AllowedStatuses.Contains(nextStatus))
            {
                throw new ValidationException("NextStatus", $"Trạng thái '{req.NextStatus}' không hợp lệ.");
            }
            ApplyStatusTransition(ticket, nextStatus, now);
        }
        else if (ticket.Status == "OPEN")
        {
            ticket.Status = "WAITING_FOR_USER";
        }

        ticket.AssignedToUserId ??= adminUserId;
        ticket.UpdatedAt = now;

        _db.SupportTicketMessages.Add(message);
        await _db.SaveChangesAsync(ct);

        await _auditWriter.WriteStaffAuditAsync(
            "admin_reply_ticket",
            "support_ticket",
            ticket.Id,
            null,
            JsonSerializer.Serialize(new { status = ticket.Status, messageId = message.Id }),
            ct);

        if (!ticket.Messages.Any(m => m.Id == message.Id))
        {
            ticket.Messages.Add(message);
        }
        return await BuildDetailDtoAsync(ticket, ct);
    }

    private async Task<SupportTicketsPageDto> ExecutePagedListAsync(
        IQueryable<SupportTicket> query,
        string? status,
        string? category,
        string? priority,
        string? search,
        string? assignedTo,
        int page,
        int pageSize,
        CancellationToken ct)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            var s = status.Trim().ToUpperInvariant();
            query = query.Where(t => t.Status == s);
        }

        if (!string.IsNullOrWhiteSpace(category) && category != "all")
        {
            var c = category.Trim().ToUpperInvariant();
            query = query.Where(t => t.Category == c);
        }

        if (!string.IsNullOrWhiteSpace(priority) && priority != "all")
        {
            var p = priority.Trim().ToUpperInvariant();
            query = query.Where(t => t.Priority == p);
        }

        if (!string.IsNullOrWhiteSpace(assignedTo) && assignedTo != "all")
        {
            query = query.Where(t => t.AssignedToUserId == assignedTo);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(t =>
                t.Subject.ToLower().Contains(term) ||
                t.TicketCode.ToLower().Contains(term) ||
                t.Id.ToLower().Contains(term));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(t => t.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var ticketIds = items.Select(t => t.Id).ToList();
        var msgCounts = await _db.SupportTicketMessages
            .Where(m => ticketIds.Contains(m.TicketId))
            .GroupBy(m => m.TicketId)
            .Select(g => new { TicketId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.TicketId, x => x.Count, ct);

        var userIds = items.Select(t => t.UserId)
            .Concat(items.Where(t => t.AssignedToUserId != null).Select(t => t.AssignedToUserId!))
            .Distinct()
            .ToList();

        var users = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => new { u.DisplayName, u.Email }, ct);

        return new SupportTicketsPageDto
        {
            Items = items.Select(t =>
            {
                users.TryGetValue(t.UserId, out var owner);
                var assignedName = t.AssignedToUserId != null && users.TryGetValue(t.AssignedToUserId, out var assignee)
                    ? assignee.DisplayName ?? assignee.Email
                    : null;

                return new SupportTicketSummaryDto
                {
                    Id = t.Id,
                    TicketCode = t.TicketCode,
                    UserId = t.UserId,
                    UserName = owner?.DisplayName ?? t.UserId,
                    UserEmail = owner?.Email ?? string.Empty,
                    Subject = t.Subject,
                    Category = t.Category,
                    Priority = t.Priority,
                    Status = t.Status,
                    AssignedToUserId = t.AssignedToUserId,
                    AssignedToName = assignedName,
                    MessageCount = msgCounts.GetValueOrDefault(t.Id, 0),
                    CreatedAt = t.CreatedAt.ToString("o"),
                    UpdatedAt = t.UpdatedAt.ToString("o"),
                    ResolvedAt = t.ResolvedAt?.ToString("o"),
                    ClosedAt = t.ClosedAt?.ToString("o")
                };
            }).ToList(),
            Page = page,
            PageSize = pageSize,
            Total = total
        };
    }

    private async Task<SupportTicketDetailDto> BuildDetailDtoAsync(SupportTicket ticket, CancellationToken ct)
    {
        var userIds = new HashSet<string> { ticket.UserId };
        if (!string.IsNullOrWhiteSpace(ticket.AssignedToUserId)) userIds.Add(ticket.AssignedToUserId);
        foreach (var m in ticket.Messages) userIds.Add(m.SenderUserId);

        var users = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => new { u.DisplayName, u.Email }, ct);

        users.TryGetValue(ticket.UserId, out var owner);
        var assignedName = ticket.AssignedToUserId != null && users.TryGetValue(ticket.AssignedToUserId, out var assignee)
            ? assignee.DisplayName ?? assignee.Email
            : null;

        return new SupportTicketDetailDto
        {
            Id = ticket.Id,
            TicketCode = ticket.TicketCode,
            UserId = ticket.UserId,
            UserName = owner?.DisplayName ?? ticket.UserId,
            UserEmail = owner?.Email ?? string.Empty,
            Subject = ticket.Subject,
            Category = ticket.Category,
            Priority = ticket.Priority,
            Status = ticket.Status,
            AssignedToUserId = ticket.AssignedToUserId,
            AssignedToName = assignedName,
            MessageCount = ticket.Messages.Count,
            CreatedAt = ticket.CreatedAt.ToString("o"),
            UpdatedAt = ticket.UpdatedAt.ToString("o"),
            ResolvedAt = ticket.ResolvedAt?.ToString("o"),
            ClosedAt = ticket.ClosedAt?.ToString("o"),
            Messages = ticket.Messages
                .OrderBy(m => m.CreatedAt)
                .Select(m =>
                {
                    users.TryGetValue(m.SenderUserId, out var sender);
                    return new SupportTicketMessageDto
                    {
                        Id = m.Id,
                        TicketId = m.TicketId,
                        SenderUserId = m.SenderUserId,
                        SenderName = sender?.DisplayName ?? m.SenderUserId,
                        SenderRole = m.SenderRole,
                        Body = m.Body,
                        CreatedAt = m.CreatedAt.ToString("o")
                    };
                })
                .ToList()
        };
    }

    private static void ApplyStatusTransition(SupportTicket ticket, string nextStatus, DateTimeOffset now)
    {
        ticket.Status = nextStatus;
        if (nextStatus == "RESOLVED")
        {
            ticket.ResolvedAt ??= now;
            ticket.ClosedAt = null;
        }
        else if (nextStatus == "CLOSED")
        {
            ticket.ClosedAt ??= now;
        }
        else
        {
            ticket.ResolvedAt = null;
            ticket.ClosedAt = null;
        }
    }
}
