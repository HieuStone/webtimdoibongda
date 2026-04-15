using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using TimDoiBongDa.Domain.Enums;

namespace TimDoiBongDa.Application.DTOs.MatchDtos
{
    public class MatchFilter : PagingParams<MatchResponse>
    {
        public DateTime? MatchTime { get; set; }
        public MatchStatus? Status { get; set; }
        public bool? IsOpponent { get; set; }
        public long? TeamId { get; set; }
        public bool? IsHomeMatch { get; set; }

        public override List<Expression<Func<MatchResponse, bool>>> GetPredicates()
        {
            var predicates = base.GetPredicates();

            if (MatchTime.HasValue)
            {
                var date = MatchTime.Value.Date;
                predicates.Add(x => x.MatchTime.Date == date);
            }

            if (Status.HasValue)
            {
                predicates.Add(x => x.Status == Status.Value);
            }

            if (TeamId.HasValue)
            {
                predicates.Add(x => x.CreatorTeamId == TeamId.Value);
            }

            if (IsHomeMatch.HasValue)
            {
                predicates.Add(x => x.IsHomeMatch == IsHomeMatch.Value);
            }

            if (!string.IsNullOrEmpty(SearchTerm))
            {
                var term = SearchTerm.ToLower();
                predicates.Add(x => (x.StadiumName != null && x.StadiumName.ToLower().Contains(term)) 
                                 || (x.CreatorTeamName != null && x.CreatorTeamName.ToLower().Contains(term))
                                 || (x.OpponentTeamName != null && x.OpponentTeamName.ToLower().Contains(term)));
            }

            return predicates;
        }
    }
}
