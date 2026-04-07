using System.ComponentModel.DataAnnotations;

namespace MyApi.Models;

public enum RequestStatus
{
    Pending,              // En attente de validation par Control
    ControlValidated,     // Validé par Control - en attente Directeur
    ControlModified,      // Modifié par Control - en attente Directeur
    ControlBlocked,       // Bloqué par Control
    DirectorValidated,   // Validé par Directeur - en attente Economat
    DirectorModified,    // Modifié par Directeur - en attente Economat
    DirectorBlocked,     // Bloqué par Directeur
    Approved,            // Finalement approuvé par Economat
    Rejected,            // Rejeté par Economat
    Finalized            // Finalisé par Economat avec produits liés
}

public class Request
{
    public int Id { get; set; }
    public DateTime RequestDate { get; set; } = DateTime.UtcNow;
    public RequestStatus Status { get; set; } = RequestStatus.Pending;
    
    // Service name (stored directly, not a separate table)
    [Required(ErrorMessage = "Le nom du service est requis")]
    [MaxLength(100)]
    public string ServiceName { get; set; } = string.Empty;
    
    public int RequestedByUserId { get; set; }
    public UserModel? RequestedByUser { get; set; }
    
    // ========== CONTROL STAGE ==========
    public int? ControlUserId { get; set; }
    public UserModel? ControlUser { get; set; }
    public DateTime? ControlDate { get; set; }
    public string? ControlReason { get; set; }  // Raison pour modification ou blocage
    
    // ========== DIRECTEUR STAGE ==========
    public int? DirectorUserId { get; set; }
    public UserModel? DirectorUser { get; set; }
    public DateTime? DirectorDate { get; set; }
    public string? DirectorReason { get; set; }  // Raison pour modification ou blocage
    
    // ========== ECONOMAT STAGE ==========
    public int? EconomatUserId { get; set; }
    public UserModel? EconomatUser { get; set; }
    public DateTime? EconomatDate { get; set; }
    public string? EconomatReason { get; set; }  // Raison pour rejection
    
    // Items
    public ICollection<RequestItem> Items { get; set; } = new List<RequestItem>();
}

public class RequestItem
{
    public int Id { get; set; }
    
    [Required(ErrorMessage = "Le nom du produit est requis")]
    [MaxLength(200)]
    public string ProductName { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "La quantité est requise")]
    public decimal Quantity { get; set; }
    
    [MaxLength(50)]
    public string Unit { get; set; } = string.Empty;
    
    public int RequestId { get; set; }
    public Request? Request { get; set; }
    
    // Optional link to Product
    public int? ProductId { get; set; }
    public Product? Product { get; set; }
}