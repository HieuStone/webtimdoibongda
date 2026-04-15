export const MatchStatus = {
    Finding: 0,
    WaitingApproval: 1,
    Scheduled: 2,
    Finished: 3,
    Cancelled: 4
}

export const MatchStatusLabel = {
    [MatchStatus.Finding]: 'Đang tìm đối',
    [MatchStatus.WaitingApproval]: 'Chờ duyệt',
    [MatchStatus.Scheduled]: 'Đã lên lịch',
    [MatchStatus.Finished]: 'Đã kết thúc',
    [MatchStatus.Cancelled]: 'Đã hủy'
}