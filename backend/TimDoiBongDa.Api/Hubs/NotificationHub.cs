using Microsoft.AspNetCore.SignalR;

namespace TimDoiBongDa.Api.Hubs;

public class NotificationHub : Hub
{
    public async Task JoinFeed()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "MatchFeed");
    }

    public async Task JoinUser(long userId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
    }

    public async Task LeaveFeed()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "MatchFeed");
    }

    public async Task SubscribeMatch(long matchId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Match_{matchId}");
    }

    public async Task UnsubscribeMatch(long matchId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Match_{matchId}");
    }
}
