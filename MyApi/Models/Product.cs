using System.ComponentModel.DataAnnotations;

namespace MyApi.Models;

public class Product
{
    public int Id { get; set; }

    [Required(ErrorMessage = "La désignation est requise")]
    [MaxLength(200)]
    public string Designation { get; set; } = string.Empty;

    [Required(ErrorMessage = "Le code produit est requis")]
    [MaxLength(50)]
    public string Code_Produit { get; set; } = string.Empty;

    // Navigation - items that use this product
    public ICollection<RequestItem> RequestItems { get; set; } = new List<RequestItem>();
}