using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApi.Data;
using MyApi.Models;

namespace MyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ServiceController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ServiceController(ApplicationDbContext context)
    {
        _context = context;
    }

    // ========== GET ALL UNIQUE SERVICE NAMES ==========
    [HttpGet]
    [Authorize(Roles = Roles.Admin + "," + Roles.Service + "," + Roles.Control + "," + Roles.Directeur + "," + Roles.Economat)]
    public async Task<ActionResult<IEnumerable<ServiceResponseModel>>> GetAllServices()
    {
        // Get all unique service names from requests
        var serviceNames = await _context.Requests
            .Select(r => r.ServiceName)
            .Distinct()
            .OrderBy(s => s)
            .ToListAsync();

        var services = serviceNames.Select(name => new ServiceResponseModel
        {
            Name = name
        }).ToList();

        return Ok(services);
    }
}

public class ServiceResponseModel
{
    public string Name { get; set; } = string.Empty;
}