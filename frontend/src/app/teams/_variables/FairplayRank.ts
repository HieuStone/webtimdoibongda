export const FairplayRanks = [
    {
        min: 0,
        max: 4,
        label: "Yếu"
    },
    {
        min: 4,
        max: 6.5,
        label: "Trung bình"
    },
    {
        min: 6.5,
        max: 8,
        label: "Khá"
    },
    {
        min: 8,
        max: 10,
        label: "Tốt"
    }
];

export const getFairplayRankLabel = (score: number) => {
    // Treat null or undefined scenarios gracefully if needed
    if (score == null) return "Chưa có đánh giá";
    
    if (score < 4) return "Yếu";
    if (score < 6.5) return "Trung bình";
    if (score < 8) return "Khá";
    return "Tốt";
};

export const getFairplayRankStyle = (score: number | null | undefined) => {
    if (score == null) return "bg-gray-50 text-gray-500 border-gray-200";
    if (score < 4) return "bg-red-50 text-red-700 border-red-200";
    if (score < 6.5) return "bg-orange-50 text-orange-700 border-orange-200";
    if (score < 8) return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
};
