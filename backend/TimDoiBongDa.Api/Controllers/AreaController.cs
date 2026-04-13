using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Application.Interfaces.Repositories;
using TimDoiBongDa.Domain.Entities;

namespace TimDoiBongDa.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AreaController : ControllerBase
{
    private readonly IGenericRepository<Area> _areaRepo;

    public AreaController(IGenericRepository<Area> areaRepo)
    {
        _areaRepo = areaRepo;
    }

    [HttpGet]
    public async Task<IActionResult> GetAreas()
    {
        // Tự động Seed khu vực nếu Database Area vẫn trống (rất tiện ở quá trình phát triển MVP)
        if (!await _areaRepo.ExistsAsync(_ => true))
        {
            await _areaRepo.AddAsync(new Area { Name = "Quận Cầu Giấy (Hà Nội)" });
            await _areaRepo.AddAsync(new Area { Name = "Quận Thanh Xuân (Hà Nội)" });
            await _areaRepo.AddAsync(new Area { Name = "Quận Đống Đa (Hà Nội)" });
            await _areaRepo.AddAsync(new Area { Name = "Quận Hoàn Kiếm (Hà Nội)" });
            await _areaRepo.AddAsync(new Area { Name = "Quận Nam Từ Liêm (Hà Nội)" });
            await _areaRepo.AddAsync(new Area { Name = "Quận 1 (TP HCM)" });
            await _areaRepo.AddAsync(new Area { Name = "Quận 3 (TP HCM)" });
            await _areaRepo.AddAsync(new Area { Name = "Quận 7 (TP HCM)" });
            await _areaRepo.SaveAsync();
        }

        var areas = await _areaRepo.GetAllAsync();
        return Ok(areas);
    }
}
