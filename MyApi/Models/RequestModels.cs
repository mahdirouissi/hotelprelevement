using System.ComponentModel.DataAnnotations;

namespace MyApi.Models;

public class CreateRequestModel
{
    [Required(ErrorMessage = "Le service est requis")]
    [MaxLength(100, ErrorMessage = "Le nom du service ne peut pas dépasser 100 caractères")]
    public string ServiceName { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Les articles sont requis")]
    [MinLength(1, ErrorMessage = "Au moins un article est requis")]
    public List<CreateRequestItemModel> Items { get; set; } = new();
}

public class CreateRequestItemModel
{
    [Required(ErrorMessage = "Le nom du produit est requis")]
    public string ProductName { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "La quantité est requise")]
    public decimal Quantity { get; set; }
    
    [MaxLength(50)]
    public string Unit { get; set; } = string.Empty;
}

// Modèle pour les actions (valider, modifier, bloquer) avec raison
public class ActionRequestModel
{
    public string Reason { get; set; } = string.Empty;
}

public class RejectRequestModel
{
    [Required(ErrorMessage = "La raison du rejet est requise")]
    public string Reason { get; set; } = string.Empty;
}

// Modèle pour modifier les items d'une demande
public class UpdateRequestItemsModel
{
    [Required(ErrorMessage = "Les articles sont requis")]
    [MinLength(1, ErrorMessage = "Au moins un article est requis")]
    public List<CreateRequestItemModel> Items { get; set; } = new();
    
    [Required(ErrorMessage = "La raison de modification est requise")]
    public string Reason { get; set; } = string.Empty;
}

public class RequestResponseModel
{
    public int Id { get; set; }
    public DateTime RequestDate { get; set; }
    public RequestStatus Status { get; set; }
    public string StatusText { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string RequestedByUserName { get; set; } = string.Empty;
    
    // ========== CONTROL ==========
    public string? ControlBy { get; set; }
    public DateTime? ControlDate { get; set; }
    public string? ControlReason { get; set; }
    
    // ========== DIRECTEUR ==========
    public string? DirectorBy { get; set; }
    public DateTime? DirectorDate { get; set; }
    public string? DirectorReason { get; set; }
    
    // ========== ECONOMAT ==========
    public string? EconomatBy { get; set; }
    public DateTime? EconomatDate { get; set; }
    public string? EconomatReason { get; set; }
    
    public List<RequestItemResponseModel> Items { get; set; } = new();
}

public class RequestItemResponseModel
{
    public int Id { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    
    // Optional linked product info
    public int? ProductId { get; set; }
    public string? ProductCode { get; set; }
    public string? ProductDesignation { get; set; }
}

// Model for finalizing a request with product links
public class FinalizeRequestModel
{
    [Required(ErrorMessage = "Les liens de produits sont requis")]
    public List<RequestItemProductLink> ProductLinks { get; set; } = new();
}

public class RequestItemProductLink
{
    [Required(ErrorMessage = "L'ID de l'article est requis")]
    public int RequestItemId { get; set; }
    
    [Required(ErrorMessage = "L'ID du produit est requis")]
    public int ProductId { get; set; }
}

// Model to get available products for linking
public class ProductListItem
{
    public int Id { get; set; }
    public string Code_Produit { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
}

// Model to create a new product
public class CreateProductModel
{
    [Required(ErrorMessage = "Le code produit est requis")]
    [MaxLength(50)]
    public string Code_Produit { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "La désignation est requise")]
    [MaxLength(200)]
    public string Designation { get; set; } = string.Empty;
}

// Model for product statistics
public class ProductStatistics
{
    public int ProductId { get; set; }
    public string Code_Produit { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public int RequestCount { get; set; }
    public decimal TotalQuantity { get; set; }
}

// Model for processing time statistics
public class ProcessingTimeStatistics
{
    public int TotalRequests { get; set; }
    public double AverageHours { get; set; }
    public double MinHours { get; set; }
    public double MaxHours { get; set; }
    public List<HourRangeCount> RequestsByHourRange { get; set; } = new();
}

public class HourRangeCount
{
    public string Range { get; set; } = string.Empty;
    public int Count { get; set; }
}