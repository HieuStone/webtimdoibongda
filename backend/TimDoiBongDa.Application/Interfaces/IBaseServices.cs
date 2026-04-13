using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading.Tasks;
using TimDoiBongDa.Application.DTOs;

namespace TimDoiBongDa.Application.Interfaces
{
    public interface IBaseServices
    {
        long? GetCurrentUserId();
        Task<bool> IsTeamManagerAsync(long teamId, long userId);
        Task<List<long>> GetManagedTeamIdsAsync(long userId);
        Task<List<long>> GetUserTeamIdsAsync(long userId);
        Task<List<TDto>> DataFilterAsync<TEntity, TDto>(PagingParams<TDto> pagingParams, params Expression<Func<TDto, bool>>[] predicates) where TEntity : class;
        List<TDto> DataFilter<TEntity, TDto>(PagingParams<TDto> pagingParams, params Expression<Func<TDto, bool>>[] predicates) where TEntity : class;
        Task<TDto> GetByIdAsync<TEntity, TDto>(long id) where TEntity : class;
        IQueryable<TDto> Filter<TEntity, TDto>(params Expression<Func<TDto, bool>>[] predicates) where TEntity : class;
    }
}
