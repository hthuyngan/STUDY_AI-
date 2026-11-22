using StudyAI.Application.Common.Interfaces;

namespace StudyAI.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly IApplicationDbContext _db;

    public UnitOfWork(IApplicationDbContext db)
    {
        _db = db;
    }

    public Task<int> CommitAsync(CancellationToken cancellationToken = default)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
