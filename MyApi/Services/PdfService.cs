using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using MyApi.Models;

namespace MyApi.Services;

public class PdfService
{
    static PdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] GenerateOrderPdf(Request request)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontSize(11));

                page.Header().Element(c => ComposeHeader(c, request));
                page.Content().Element(c => ComposeContent(c, request));
                page.Footer().Element(ComposeFooter);
            });
        });

        return document.GeneratePdf();
    }

    private void ComposeHeader(IContainer container, Request request)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(column =>
            {
                column.Item().Text("ORDRE DE PRÉLÈVEMENT").Bold().FontSize(18).FontColor(Colors.Blue.Darken2);
                column.Item().Text($"N°: ORD-{request.Id:D6}").Bold().FontSize(14);
            });

            row.ConstantItem(100).Background(Colors.Blue.Lighten5).Padding(10).Column(column =>
            {
                column.Item().Text("Économat").Bold().FontSize(12);
                column.Item().Text("Date: " + DateTime.Now.ToString("dd/MM/yyyy")).FontSize(10);
            });
        });

        container.PaddingVertical(10);
    }

    private void ComposeContent(IContainer container, Request request)
    {
        container.Column(column =>
        {
            // Request Info Section
            column.Item().Background(Colors.Grey.Lighten4).Padding(10).Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("Service demandeur:").Bold();
                    col.Item().Text(request.ServiceName);
                });
                
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("Date de la demande:").Bold();
                    col.Item().Text(request.RequestDate.ToString("dd/MM/yyyy HH:mm"));
                });
                
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("Statut:").Bold();
                    col.Item().Text("FINALISÉ ✅").FontColor(Colors.Green.Darken2);
                });
            });

            column.Item().PaddingVertical(10);

            // Items Table
            column.Item().Text("Articles à prélever:").Bold().FontSize(13);
            column.Item().PaddingTop(5).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(40);
                    columns.RelativeColumn(3);
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn(2);
                });

                table.Header(header =>
                {
                    header.Cell().Background(Colors.Blue.Darken2).Padding(5).Text("N°").FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(5).Text("Article demandé").FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(5).Text("Code Produit").FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(5).Text("Désignation").FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(5).Text("Quantité").FontColor(Colors.White).Bold();
                });

                var index = 1;
                foreach (var item in request.Items)
                {
                    var bgColor = index % 2 == 0 ? Colors.White : Colors.Grey.Lighten4;
                    
                    table.Cell().Background(bgColor).Padding(5).Text(index.ToString());
                    table.Cell().Background(bgColor).Padding(5).Text(item.ProductName);
                    table.Cell().Background(bgColor).Padding(5).Text(item.Product?.Code_Produit ?? "-");
                    table.Cell().Background(bgColor).Padding(5).Text(item.Product?.Designation ?? "-");
                    table.Cell().Background(bgColor).Padding(5).Text($"{item.Quantity} {item.Unit}");
                    
                    index++;
                }
            });

            column.Item().PaddingVertical(20);

            // Signature Section
            column.Item().Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("Signature du responsable économat:").FontSize(10);
                    col.Item().PaddingTop(30).BorderTop(1).Text("");
                });

                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("Signature du demandeur:").FontSize(10);
                    col.Item().PaddingTop(30).BorderTop(1).Text("");
                });
            });
        });
    }

    private void ComposeFooter(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Text("Généré le: " + DateTime.Now.ToString("dd/MM/yyyy HH:mm")).FontSize(9).FontColor(Colors.Grey.Medium);
            row.RelativeItem().AlignRight().Text("Page x of y").FontSize(9).FontColor(Colors.Grey.Medium);
        });
    }
}