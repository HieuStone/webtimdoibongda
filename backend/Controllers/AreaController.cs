using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Api.Data;
using TimDoiBongDa.Api.Models;

namespace TimDoiBongDa.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AreaController : ControllerBase
{
    private readonly AppDbContext _context;

    public AreaController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAreas()
    {
        // Tự động Seed khu vực nếu Database Area vẫn trống (rất tiện ở quá trình phát triển MVP)
        if (!await _context.Areas.AnyAsync())
        {
            _context.Areas.AddRange(
                new Area { Name = "Quận Cầu Giấy (Hà Nội)" },
                new Area { Name = "Quận Thanh Xuân (Hà Nội)" },
                new Area { Name = "Quận Đống Đa (Hà Nội)" },
                new Area { Name = "Quận Hoàn Kiếm (Hà Nội)" },
                new Area { Name = "Quận Nam Từ Liêm (Hà Nội)" },
                new Area { Name = "Quận 1 (TP HCM)" },
                new Area { Name = "Quận 3 (TP HCM)" },
                new Area { Name = "Quận 7 (TP HCM)" }
            );
            await _context.SaveChangesAsync();
        }

        var areas = await _context.Areas.ToListAsync();
        return Ok(areas);
    }
}
