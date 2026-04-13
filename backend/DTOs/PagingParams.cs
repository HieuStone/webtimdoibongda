using System;
using System.Collections.Generic;
using System.Linq.Expressions;

namespace TimDoiBongDa.Api.DTOs
{
    public class PagingParams<T>
    {
        private const int MaxPageSize = 50;
        public int PageNumber { get; set; } = 1;
        private int _pageSize = 10;
        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = (value > MaxPageSize) ? MaxPageSize : value;
        }

        public string? SortBy { get; set; }
        public string? SortOrder { get; set; } = "asc"; // "asc" or "desc"
        public string? SearchTerm { get; set; }

        public virtual List<Expression<Func<T, bool>>> GetPredicates()
        {
            var predicates = new List<Expression<Func<T, bool>>>();
            
            // SearchTerm logic could be added here if common
            // if (!string.IsNullOrEmpty(SearchTerm)) { ... }

            return predicates;
        }
    }
}
