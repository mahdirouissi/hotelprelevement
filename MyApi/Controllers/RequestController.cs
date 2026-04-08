using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApi.Data;
using MyApi.Models;

namespace MyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RequestController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public RequestController(ApplicationDbContext context)
    {
        _context = context;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim!);
    }

    private string GetCurrentUserRole()
    {
        return User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
    }

    // ========== CREATE REQUEST (Service role) ==========
    [HttpPost]
    [Authorize(Roles = Roles.Service)]
    public async Task<ActionResult<RequestResponseModel>> CreateRequest([FromBody] CreateRequestModel model)
    {
        var userId = GetCurrentUserId();
        
        var request = new Request
        {
            RequestDate = DateTime.UtcNow,
            Status = RequestStatus.Pending,
            ServiceName = model.ServiceName,
            RequestedByUserId = userId
        };

        foreach (var item in model.Items)
        {
            request.Items.Add(new RequestItem
            {
                ProductName = item.ProductName,
                Quantity = item.Quantity,
                Unit = item.Unit
            });
        }

        _context.Requests.Add(request);
        await _context.SaveChangesAsync();

        var response = await GetRequestResponse(request.Id);
        return CreatedAtAction(nameof(GetRequestById), new { id = request.Id }, response);
    }

    // ========== GET ALL REQUESTS ==========
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RequestResponseModel>>> GetRequests()
    {
        var userId = GetCurrentUserId();
        var userRole = GetCurrentUserRole();

        List<Request> requests;

        switch (userRole)
        {
            case Roles.Admin:
            case Roles.Economat:
                requests = await _context.Requests
                    .Include(r => r.RequestedByUser)
                    .Include(r => r.ControlUser)
                    .Include(r => r.DirectorUser)
                    .Include(r => r.EconomatUser)
                    .Include(r => r.Items)
                    .ThenInclude(i => i.Product)
                    .OrderByDescending(r => r.RequestDate)
                    .ToListAsync();
                break;
                
            case Roles.Directeur:
                requests = await _context.Requests
                    .Include(r => r.RequestedByUser)
                    .Include(r => r.ControlUser)
                    .Include(r => r.DirectorUser)
                    .Include(r => r.EconomatUser)
                    .Include(r => r.Items)
                    .ThenInclude(i => i.Product)
                    .OrderByDescending(r => r.RequestDate)
                    .ToListAsync();
                break;
                
            case Roles.Control:
                requests = await _context.Requests
                    .Include(r => r.RequestedByUser)
                    .Include(r => r.ControlUser)
                    .Include(r => r.DirectorUser)
                    .Include(r => r.EconomatUser)
                    .Include(r => r.Items)
                    .ThenInclude(i => i.Product)
                    .OrderByDescending(r => r.RequestDate)
                    .ToListAsync();
                break;
                
            case Roles.Service:
                requests = await _context.Requests
                    .Include(r => r.RequestedByUser)
                    .Include(r => r.ControlUser)
                    .Include(r => r.DirectorUser)
                    .Include(r => r.EconomatUser)
                    .Include(r => r.Items)
                    .ThenInclude(i => i.Product)
                    .Where(r => r.RequestedByUserId == userId)
                    .OrderByDescending(r => r.RequestDate)
                    .ToListAsync();
                break;
                
            default:
                return Forbid();
        }

        var responses = GetRequestsResponse(requests);
        return Ok(responses);
    }

    // ========== GET SINGLE REQUEST ==========
    [HttpGet("{id}")]
    public async Task<ActionResult<RequestResponseModel>> GetRequestById(int id)
    {
        var userRole = GetCurrentUserRole();

        var request = await _context.Requests
            .Include(r => r.RequestedByUser)
            .Include(r => r.ControlUser)
            .Include(r => r.DirectorUser)
            .Include(r => r.EconomatUser)
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request == null)
        {
            return NotFound(new { message = "Demande non trouvée" });
        }

        if (userRole != Roles.Admin && 
            userRole != Roles.Economat && 
            userRole != Roles.Directeur &&
            userRole != Roles.Control &&
            request.RequestedByUserId != GetCurrentUserId())
        {
            return Forbid();
        }

        var response = await GetRequestResponse(id);
        return Ok(response);
    }

    // ========== FILTER REQUESTS BY SERVICE NAME (Service role) ==========
    [HttpGet("by-service/{serviceName}")]
    [Authorize(Roles = Roles.Service)]
    public async Task<ActionResult<IEnumerable<RequestResponseModel>>> GetRequestsByServiceName(string serviceName)
    {
        var userId = GetCurrentUserId();
        
        // Get all unique service names the user has access to
        var userServiceNames = await _context.Requests
            .Where(r => r.RequestedByUserId == userId)
            .Select(r => r.ServiceName)
            .Distinct()
            .ToListAsync();
        
        // If user requests a service name not in their list, deny access
        if (!userServiceNames.Contains(serviceName))
        {
            return Forbid();
        }

        var requests = await _context.Requests
            .Include(r => r.RequestedByUser)
            .Include(r => r.ControlUser)
            .Include(r => r.DirectorUser)
            .Include(r => r.EconomatUser)
            .Include(r => r.Items)
            .ThenInclude(i => i.Product)
            .Where(r => r.ServiceName == serviceName)
            .OrderByDescending(r => r.RequestDate)
            .ToListAsync();

        var responses = GetRequestsResponse(requests);
        return Ok(responses);
    }

    // ========== CONTROL ACTIONS ==========
    [HttpPost("{id}/control-validate")]
    [Authorize(Roles = Roles.Control)]
    public async Task<IActionResult> ControlValidate(int id, [FromBody] ActionRequestModel model)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound(new { message = "Demande non trouvée" });
        
        if (request.Status != RequestStatus.Pending && request.Status != RequestStatus.ControlModified)
            return BadRequest(new { message = "La demande n'est pas en attente de validation" });

        var userId = GetCurrentUserId();
        request.ControlUserId = userId;
        request.ControlDate = DateTime.UtcNow;
        // Keep existing reason if no new reason provided
        if (!string.IsNullOrEmpty(model.Reason))
        {
            request.ControlReason = model.Reason;
        }
        request.Status = RequestStatus.ControlValidated;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Demande validée par le contrôle" });
    }

    [HttpPost("{id}/control-modify")]
    [Authorize(Roles = Roles.Control)]
    public async Task<IActionResult> ControlModify(int id, [FromBody] ActionRequestModel model)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound(new { message = "Demande non trouvée" });
        
        if (request.Status != RequestStatus.Pending)
            return BadRequest(new { message = "La demande n'est pas en attente de validation" });

        var userId = GetCurrentUserId();
        request.ControlUserId = userId;
        request.ControlDate = DateTime.UtcNow;
        request.ControlReason = model.Reason;
        request.Status = RequestStatus.ControlModified;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Demande modifiée par le contrôle" });
    }

    [HttpPost("{id}/control-block")]
    [Authorize(Roles = Roles.Control)]
    public async Task<IActionResult> ControlBlock(int id, [FromBody] ActionRequestModel model)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound(new { message = "Demande non trouvée" });
        
        if (request.Status != RequestStatus.Pending && request.Status != RequestStatus.ControlModified)
            return BadRequest(new { message = "La demande n'est pas en attente de validation" });

        var userId = GetCurrentUserId();
        request.ControlUserId = userId;
        request.ControlDate = DateTime.UtcNow;
        request.ControlReason = model.Reason;
        request.Status = RequestStatus.ControlBlocked;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Demande bloquée par le contrôle" });
    }

    // ========== UPDATE REQUEST ITEMS (Control role) ==========
    [HttpPut("{id}/items")]
    [Authorize(Roles = Roles.Control)]
    public async Task<IActionResult> UpdateRequestItems(int id, [FromBody] UpdateRequestItemsModel model)
    {
        var request = await _context.Requests
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == id);
            
        if (request == null) return NotFound(new { message = "Demande non trouvée" });
        
        if (request.Status != RequestStatus.Pending && request.Status != RequestStatus.ControlValidated)
            return BadRequest(new { message = "Les demandes validées ou bloquées ne peuvent pas être modifiées" });

        _context.RequestItems.RemoveRange(request.Items);
        
        foreach (var item in model.Items)
        {
            request.Items.Add(new RequestItem
            {
                ProductName = item.ProductName,
                Quantity = item.Quantity,
                Unit = item.Unit
            });
        }

        if (!string.IsNullOrEmpty(model.Reason))
        {
            request.ControlReason = model.Reason;
            request.ControlDate = DateTime.UtcNow;
            request.ControlUserId = GetCurrentUserId();
        }
        
        request.Status = RequestStatus.ControlModified;

        await _context.SaveChangesAsync();
        
        var response = await GetRequestResponse(id);
        return Ok(response);
    }

    // ========== DIRECTEUR ACTIONS ==========
    [HttpPost("{id}/director-validate")]
    [Authorize(Roles = Roles.Directeur)]
    public async Task<IActionResult> DirectorValidate(int id, [FromBody] ActionRequestModel model)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound(new { message = "Demande non trouvée" });
        
        if (request.Status != RequestStatus.ControlValidated && 
            request.Status != RequestStatus.DirectorModified)
            return BadRequest(new { message = "La demande n'est pas prête pour la validation du directeur" });

        var userId = GetCurrentUserId();
        request.DirectorUserId = userId;
        request.DirectorDate = DateTime.UtcNow;
        // Keep existing reason if no new reason provided
        if (!string.IsNullOrEmpty(model.Reason))
        {
            request.DirectorReason = model.Reason;
        }
        request.Status = RequestStatus.DirectorValidated;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Demande validée par le directeur" });
    }

    // ========== DIRECTOR UPDATE ITEMS ==========
    [HttpPut("{id}/director-items")]
    [Authorize(Roles = Roles.Directeur)]
    public async Task<IActionResult> UpdateDirectorItems(int id, [FromBody] UpdateRequestItemsModel model)
    {
        var request = await _context.Requests
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == id);
            
        if (request == null) return NotFound(new { message = "Demande non trouvée" });
        
        if (request.Status != RequestStatus.ControlValidated && 
            request.Status != RequestStatus.DirectorModified)
            return BadRequest(new { message = "Les demandes non validées par le contrôle ne peuvent pas être modifiées" });

        _context.RequestItems.RemoveRange(request.Items);
        
        foreach (var item in model.Items)
        {
            request.Items.Add(new RequestItem
            {
                ProductName = item.ProductName,
                Quantity = item.Quantity,
                Unit = item.Unit
            });
        }

        if (!string.IsNullOrEmpty(model.Reason))
        {
            request.DirectorReason = model.Reason;
            request.DirectorDate = DateTime.UtcNow;
            request.DirectorUserId = GetCurrentUserId();
        }
        
        request.Status = RequestStatus.DirectorModified;

        await _context.SaveChangesAsync();
        
        var response = await GetRequestResponse(id);
        return Ok(response);
    }

    [HttpPost("{id}/director-modify")]
    [Authorize(Roles = Roles.Directeur)]
    public async Task<IActionResult> DirectorModify(int id, [FromBody] ActionRequestModel model)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound(new { message = "Demande non trouvée" });
        
        if (request.Status != RequestStatus.ControlValidated && 
            request.Status != RequestStatus.DirectorModified)
            return BadRequest(new { message = "La demande n'est pas prête pour la validation du directeur" });

        var userId = GetCurrentUserId();
        request.DirectorUserId = userId;
        request.DirectorDate = DateTime.UtcNow;
        request.DirectorReason = model.Reason;
        request.Status = RequestStatus.DirectorModified;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Demande modifiée par le directeur" });
    }

    [HttpPost("{id}/director-block")]
    [Authorize(Roles = Roles.Directeur)]
    public async Task<IActionResult> DirectorBlock(int id, [FromBody] ActionRequestModel model)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound(new { message = "Demande non trouvée" });
        
        if (request.Status != RequestStatus.ControlValidated && 
            request.Status != RequestStatus.DirectorModified)
            return BadRequest(new { message = "La demande n'est pas prête pour la validation du directeur" });

        var userId = GetCurrentUserId();
        request.DirectorUserId = userId;
        request.DirectorDate = DateTime.UtcNow;
        request.DirectorReason = model.Reason;
        request.Status = RequestStatus.DirectorBlocked;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Demande bloquée par le directeur" });
    }

    // ========== ECONOMAT ACTIONS ==========
    [HttpPost("{id}/economat-validate")]
    [Authorize(Roles = Roles.Economat)]
    public async Task<IActionResult> EconomatValidate(int id, [FromBody] ActionRequestModel model)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound(new { message = "Demande non trouvée" });
        
        if (request.Status != RequestStatus.DirectorValidated)
            return BadRequest(new { message = "La demande n'est pas prête pour la validation de l'économat" });

        var userId = GetCurrentUserId();
        request.EconomatUserId = userId;
        request.EconomatDate = DateTime.UtcNow;
        request.EconomatReason = model.Reason;
        request.Status = RequestStatus.Approved;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Demande approuvée par l'économat" });
    }

    [HttpPost("{id}/economat-modify")]
    [Authorize(Roles = Roles.Economat)]
    public async Task<IActionResult> EconomatModify(int id, [FromBody] ActionRequestModel model)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound(new { message = "Demande non trouvée" });
        
        if (request.Status != RequestStatus.DirectorValidated && request.Status != RequestStatus.DirectorModified)
            return BadRequest(new { message = "La demande n'est pas prête pour la validation de l'économat" });

        var userId = GetCurrentUserId();
        request.EconomatUserId = userId;
        request.EconomatDate = DateTime.UtcNow;
        request.EconomatReason = model.Reason;
        request.Status = RequestStatus.DirectorModified;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Demande renvoyée au directeur pour modification" });
    }

    [HttpPost("{id}/economat-reject")]
    [Authorize(Roles = Roles.Economat)]
    public async Task<IActionResult> EconomatReject(int id, [FromBody] ActionRequestModel model)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound(new { message = "Demande non trouvée" });
        
        if (request.Status != RequestStatus.DirectorValidated && request.Status != RequestStatus.DirectorModified)
            return BadRequest(new { message = "La demande n'est pas prête pour la validation de l'économat" });

        var userId = GetCurrentUserId();
        request.EconomatUserId = userId;
        request.EconomatDate = DateTime.UtcNow;
        request.EconomatReason = model.Reason;
        request.Status = RequestStatus.Rejected;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Demande rejetée par l'économat" });
    }

    // ========== FINALIZE REQUEST (with product links) ==========
    [HttpGet("products")]
    [Authorize(Roles = Roles.Service + "," + Roles.Economat + "," + Roles.Admin)]
    public async Task<ActionResult<IEnumerable<ProductListItem>>> GetAvailableProducts()
    {
        var products = await _context.Products
            .OrderBy(p => p.Code_Produit)
            .Select(p => new ProductListItem
            {
                Id = p.Id,
                Code_Produit = p.Code_Produit,
                Designation = p.Designation
            })
            .ToListAsync();
        
        return Ok(products);
    }

    // ========== GET MOST REQUESTED PRODUCTS ==========
    [HttpGet("products/statistics")]
    [Authorize(Roles = Roles.Economat + "," + Roles.Admin)]
    public async Task<ActionResult<IEnumerable<ProductStatistics>>> GetMostRequestedProducts()
    {
        var productStats = await _context.RequestItems
            .Where(i => i.ProductId != null)
            .GroupBy(i => new { i.ProductId, i.Product!.Code_Produit, i.Product!.Designation })
            .Select(g => new ProductStatistics
            {
                ProductId = g.Key.ProductId!.Value,
                Code_Produit = g.Key.Code_Produit,
                Designation = g.Key.Designation,
                RequestCount = g.Count(),
                TotalQuantity = g.Sum(i => i.Quantity)
            })
            .OrderByDescending(p => p.RequestCount)
            .ToListAsync();
        
        return Ok(productStats);
    }

    // ========== GET PROCESSING TIME STATISTICS ==========
    [HttpGet("processing-time-statistics")]
    [Authorize(Roles = Roles.Economat + "," + Roles.Admin)]
    public async Task<ActionResult<ProcessingTimeStatistics>> GetProcessingTimeStatistics()
    {
        var finalizedRequests = await _context.Requests
            .Where(r => r.Status == RequestStatus.Finalized && r.EconomatDate != null)
            .ToListAsync();

        if (!finalizedRequests.Any())
        {
            return Ok(new ProcessingTimeStatistics
            {
                TotalRequests = 0,
                AverageHours = 0,
                MinHours = 0,
                MaxHours = 0,
                RequestsByHourRange = new List<HourRangeCount>()
            });
        }

        var processingTimes = finalizedRequests
            .Select(r => (r.EconomatDate!.Value - r.RequestDate).TotalHours)
            .ToList();

        var avgHours = processingTimes.Average();
        var minHours = processingTimes.Min();
        var maxHours = processingTimes.Max();

        // Group by hour ranges
        var requestsByRange = processingTimes
            .GroupBy(h => h switch
            {
                <= 24 => "0-24h",
                <= 48 => "24-48h",
                <= 72 => "48-72h",
                <= 168 => "3-7 jours",
                <= 336 => "1-2 semaines",
                _ => "+2 semaines"
            })
            .Select(g => new HourRangeCount
            {
                Range = g.Key,
                Count = g.Count()
            })
            .OrderByDescending(r => r.Range switch { "0-24h" => 1, "24-48h" => 2, "48-72h" => 3, "3-7 jours" => 4, "1-2 semaines" => 5, _ => 6 })
            .ToList();

        return Ok(new ProcessingTimeStatistics
        {
            TotalRequests = finalizedRequests.Count,
            AverageHours = Math.Round(avgHours, 2),
            MinHours = Math.Round(minHours, 2),
            MaxHours = Math.Round(maxHours, 2),
            RequestsByHourRange = requestsByRange
        });
    }

    [HttpPost("products")]
    [Authorize(Roles = Roles.Economat + "," + Roles.Admin)]
    public async Task<ActionResult<ProductListItem>> CreateProduct([FromBody] CreateProductModel model)
    {
        var existingProduct = await _context.Products
            .FirstOrDefaultAsync(p => p.Code_Produit == model.Code_Produit);
            
        if (existingProduct != null)
            return BadRequest(new { message = "Un produit avec ce code existe déjà" });
        
        var product = new Product
        {
            Code_Produit = model.Code_Produit,
            Designation = model.Designation
        };
        
        _context.Products.Add(product);
        await _context.SaveChangesAsync();
        
        return Ok(new ProductListItem
        {
            Id = product.Id,
            Code_Produit = product.Code_Produit,
            Designation = product.Designation
        });
    }

    [HttpPost("{id}/finalize")]
    [Authorize(Roles = Roles.Economat)]
    public async Task<IActionResult> FinalizeRequest(int id, [FromBody] FinalizeRequestModel model)
    {
        var request = await _context.Requests
            .Include(r => r.Items)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(r => r.Id == id);
            
        if (request == null) return NotFound(new { message = "Demande non trouvée" });
        
        if (request.Status != RequestStatus.Approved)
            return BadRequest(new { message = "Seules les demandes approuvées peuvent être finalisées" });
        
        // Verify all items have product links
        if (model.ProductLinks == null || model.ProductLinks.Count == 0)
            return BadRequest(new { message = "Au moins un lien de produit est requis" });
        
        foreach (var link in model.ProductLinks)
        {
            var item = request.Items.FirstOrDefault(i => i.Id == link.RequestItemId);
            if (item == null)
                return BadRequest(new { message = $"Article {link.RequestItemId} non trouvé" });
            
            var product = await _context.Products.FindAsync(link.ProductId);
            if (product == null)
                return BadRequest(new { message = $"Produit {link.ProductId} non trouvé" });
            
            item.ProductId = link.ProductId;
        }
        
        var userId = GetCurrentUserId();
        request.EconomatUserId = userId;
        request.EconomatDate = DateTime.UtcNow;
        request.Status = RequestStatus.Finalized;
        
        await _context.SaveChangesAsync();
        
        var response = await GetRequestResponse(id);
        return Ok(response);
    }

    // ========== PRIVATE METHODS ==========
    private async Task<RequestResponseModel> GetRequestResponse(int id)
    {
        var request = await _context.Requests
            .Include(r => r.RequestedByUser)
            .Include(r => r.ControlUser)
            .Include(r => r.DirectorUser)
            .Include(r => r.EconomatUser)
            .Include(r => r.Items)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(r => r.Id == id);

        return MapToResponse(request!);
    }

    private List<RequestResponseModel> GetRequestsResponse(List<Request> requests)
    {
        var responses = new List<RequestResponseModel>();
        foreach (var request in requests)
        {
            responses.Add(MapToResponse(request));
        }
        return responses;
    }

    private RequestResponseModel MapToResponse(Request request)
    {
        return new RequestResponseModel
        {
            Id = request.Id,
            RequestDate = request.RequestDate,
            Status = request.Status,
            StatusText = request.Status.ToString(),
            ServiceName = request.ServiceName,
            RequestedByUserName = request.RequestedByUser?.Username ?? string.Empty,
            
            ControlBy = request.ControlUser?.Username,
            ControlDate = request.ControlDate,
            ControlReason = request.ControlReason,
            
            DirectorBy = request.DirectorUser?.Username,
            DirectorDate = request.DirectorDate,
            DirectorReason = request.DirectorReason,
            
            EconomatBy = request.EconomatUser?.Username,
            EconomatDate = request.EconomatDate,
            EconomatReason = request.EconomatReason,
            
            Items = request.Items.Select(i => new RequestItemResponseModel
            {
                Id = i.Id,
                ProductName = i.ProductName,
                Quantity = i.Quantity,
                Unit = i.Unit,
                ProductId = i.ProductId,
                ProductCode = i.Product?.Code_Produit,
                ProductDesignation = i.Product?.Designation
            }).ToList()
        };
    }
}