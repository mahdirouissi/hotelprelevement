using Microsoft.EntityFrameworkCore;
using MyApi.Models;

namespace MyApi.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<UserModel> Users { get; set; } = null!;
    public DbSet<Request> Requests { get; set; } = null!;
    public DbSet<RequestItem> RequestItems { get; set; } = null!;
    public DbSet<Product> Products { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<UserModel>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.Role).IsRequired().HasMaxLength(20);
            entity.Property(e => e.ServiceName).HasMaxLength(100);
            entity.Property(e => e.CreatedAt).IsRequired();
        });

        modelBuilder.Entity<Request>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<string>();
            
            // Requested by user
            entity.HasOne(e => e.RequestedByUser)
                .WithMany()
                .HasForeignKey(e => e.RequestedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
                
            // Control user
            entity.HasOne(e => e.ControlUser)
                .WithMany()
                .HasForeignKey(e => e.ControlUserId)
                .OnDelete(DeleteBehavior.Restrict);
                
            // Director user
            entity.HasOne(e => e.DirectorUser)
                .WithMany()
                .HasForeignKey(e => e.DirectorUserId)
                .OnDelete(DeleteBehavior.Restrict);
                
            // Economat user
            entity.HasOne(e => e.EconomatUser)
                .WithMany()
                .HasForeignKey(e => e.EconomatUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RequestItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProductName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Quantity).IsRequired().HasPrecision(18, 2);
            entity.Property(e => e.Unit).HasMaxLength(50);
            
            entity.HasOne(e => e.Request)
                .WithMany(r => r.Items)
                .HasForeignKey(e => e.RequestId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // Optional link to Product
            entity.HasOne(e => e.Product)
                .WithMany(p => p.RequestItems)
                .HasForeignKey(e => e.ProductId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Designation).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Code_Produit).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => e.Code_Produit).IsUnique();
        });
    }
}
