using System;
using System.Collections.Generic;
using System.Linq.Expressions;

namespace TimDoiBongDa.Api.DTOs.MatchDtos
{
    public class MatchFilter : PagingParams<MatchResponse>
    {
        public DateTime? MatchTime { get; set; }
        public string? Status { get; set; }
        public bool? IsOpponent { get; set; }

        public override List<Expression<Func<MatchResponse, bool>>> GetPredicates()
        {
            var predicates = base.GetPredicates();

            if (MatchTime.HasValue)
            {
                var date = MatchTime.Value.Date;
                predicates.Add(x => x.MatchTime.Date == date);
            }

            if (!string.IsNullOrEmpty(Status))
            {
                predicates.Add(x => x.Status == Status);
            }

            return predicates;
        }
    }
}
