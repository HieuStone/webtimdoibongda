using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using TimDoiBongDa.Application.Interfaces;
using TimDoiBongDa.Application.Interfaces.Repositories;

namespace TimDoiBongDa.Infrastructure.Repositories;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    protected readonly IAppDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public GenericRepository(IAppDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(long id)
    {
        return await _dbSet.FindAsync(id);
    }

    public async Task<IEnumerable<T>> GetAllAsync()
    {
        return await _dbSet.ToListAsync();
    }

    public IQueryable<T> Find(Expression<Func<T, bool>> expression)
    {
        return _dbSet.Where(expression);
    }

    public async Task AddAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
    }

    public void Update(T entity)
    {
        _dbSet.Update(entity);
    }

    public void Remove(T entity)
    {
        _dbSet.Remove(entity);
    }

    public async Task<bool> ExistsAsync(Expression<Func<T, bool>> expression)
    {
        return await _dbSet.AnyAsync(expression);
    }

    public async Task<int> SaveAsync()
    {
        return await _context.SaveChangesAsync();
    }
}
