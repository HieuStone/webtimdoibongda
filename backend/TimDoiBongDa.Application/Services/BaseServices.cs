using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using System.Security.Claims;
using TimDoiBongDa.Application.DTOs;
using TimDoiBongDa.Application.Interfaces;

using TimDoiBongDa.Application.Interfaces.Repositories;
using TimDoiBongDa.Domain.Entities;

namespace TimDoiBongDa.Application.Services
{
    public class BaseServices : IBaseServices
    {
        private readonly IAppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IMapper _mapper;
        private readonly IGenericRepository<Team> _teamRepo;
        private readonly IGenericRepository<TeamUser> _teamUserRepo;

        public BaseServices(
            IAppDbContext context, 
            IHttpContextAccessor httpContextAccessor, 
            IMapper mapper,
            IGenericRepository<Team> teamRepo,
            IGenericRepository<TeamUser> teamUserRepo)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
            _mapper = mapper;
            _teamRepo = teamRepo;
            _teamUserRepo = teamUserRepo;
        }

        public long? GetCurrentUserId()
        {
            var userIdString = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var userId))
            {
                return null;
            }
            return userId;
        }

        public async Task<bool> IsTeamManagerAsync(long teamId, long userId)
        {
            return await _teamRepo.ExistsAsync(t => t.Id == teamId && t.ManagerId == userId);
        }

        public async Task<List<long>> GetManagedTeamIdsAsync(long userId)
        {
            return await _teamRepo.Find(t => t.ManagerId == userId)
                .Select(t => t.Id)
                .ToListAsync();
        }

        public async Task<List<long>> GetUserTeamIdsAsync(long userId)
        {
            return await _teamUserRepo.Find(tu => tu.UserId == userId && tu.Status == "approved")
                .Select(tu => tu.TeamId)
                .ToListAsync();
        }

        public List<TDto> DataFilter<TEntity, TDto>(PagingParams<TDto> pagingParams, params Expression<Func<TDto, bool>>[] predicates) where TEntity : class
        {
            var query = _context.Set<TEntity>().ProjectTo<TDto>(_mapper.ConfigurationProvider);

            // Combine predicates from parameters class
            var allPredicates = pagingParams.GetPredicates();

            // Add extra predicates passed to the method
            if (predicates != null)
            {
                allPredicates.AddRange(predicates);
            }

            foreach (var predicate in allPredicates)
            {
                query = query.Where(predicate);
            }

            // Simple Sort (You might need a better logic for dynamic sorting)
            if (!string.IsNullOrEmpty(pagingParams.SortBy))
            {
                // query = query.OrderBy(...) // Needs reflection or a library for dynamic sorting
            }

            // Paging
            var result = query
                .Skip((pagingParams.PageNumber - 1) * pagingParams.PageSize)
                .Take(pagingParams.PageSize)
                .ToList();

            return result;
        }
        public virtual IQueryable<TDto> Filter<TEntity, TDto>(params Expression<Func<TDto, bool>>[] predicates) where TEntity : class
        {
            var query = _context.Set<TEntity>().ProjectTo<TDto>(_mapper.ConfigurationProvider);

            if (predicates != null)
            {
                foreach (var predicate in predicates)
                {
                    query = query.Where(predicate);
                }
            }

            return query;
        }
        public async Task<TDto> GetByIdAsync<TEntity, TDto>(long id) where TEntity : class
        {
            var entity = await _context.Set<TEntity>().FindAsync(id);
            if (entity == null)
            {
                return default;
            }
            return _mapper.Map<TDto>(entity);
        }
        public async Task<List<TDto>> DataFilterAsync<TEntity, TDto>(PagingParams<TDto> pagingParams, params Expression<Func<TDto, bool>>[] predicates) where TEntity : class
        {
            var query = _context.Set<TEntity>().ProjectTo<TDto>(_mapper.ConfigurationProvider);

            // Combine predicates from parameters class
            var allPredicates = pagingParams.GetPredicates();

            // Add extra predicates passed to the method
            if (predicates != null)
            {
                allPredicates.AddRange(predicates);
            }

            foreach (var predicate in allPredicates)
            {
                query = query.Where(predicate);
            }

            // Simple Sort (You might need a better logic for dynamic sorting)
            if (!string.IsNullOrEmpty(pagingParams.SortBy))
            {
                // query = query.OrderBy(...) // Needs reflection or a library for dynamic sorting
            }

            // Paging
            var result = await query
                .Skip((pagingParams.PageNumber - 1) * pagingParams.PageSize)
                .Take(pagingParams.PageSize)
                .ToListAsync();

            return result;
        }


    }
}