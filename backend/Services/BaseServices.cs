using System.Linq.Expressions;
using System.Threading.Tasks;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Api.Data;
using TimDoiBongDa.Api.Interfaces;
using TimDoiBongDa.Api.Models;
using TimDoiBongDa.Api.DTOs;
using System.Security.Claims;
using System.Collections.Generic;
using System.Linq;
using System;

namespace TimDoiBongDa.Api.Services
{
    public class BaseServices : IBaseServices
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IMapper _mapper;

        public BaseServices(AppDbContext context, IHttpContextAccessor httpContextAccessor, IMapper mapper)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
            _mapper = mapper;
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
            return await _context.Teams.AnyAsync(t => t.Id == teamId && t.ManagerId == userId);
        }

        public async Task<List<long>> GetManagedTeamIdsAsync(long userId)
        {
            return await _context.Teams
                .Where(t => t.ManagerId == userId)
                .Select(t => t.Id)
                .ToListAsync();
        }

        public async Task<List<long>> GetUserTeamIdsAsync(long userId)
        {
            return await _context.TeamUsers
                .Where(tu => tu.UserId == userId && tu.Status == "approved")
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