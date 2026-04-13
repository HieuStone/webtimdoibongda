using System.Linq.Expressions;

namespace TimDoiBongDa.Application.Interfaces.Repositories;

public interface IGenericRepository<T> where T : class
{
    Task<T?> GetByIdAsync(long id);
    Task<IEnumerable<T>> GetAllAsync();
    IQueryable<T> Find(Expression<Func<T, bool>> expression);
    Task AddAsync(T entity);
    void Update(T entity);
    void Remove(T entity);
    Task<bool> ExistsAsync(Expression<Func<T, bool>> expression);
    Task<int> SaveAsync();
}
