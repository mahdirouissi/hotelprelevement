# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY MyApi.csproj ./
RUN dotnet restore MyApi.csproj

# Copy all source files
COPY . .

# Build the application
WORKDIR /src/MyApi
RUN dotnet publish -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Install libgdiplus for QuestPDF (required for PDF generation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdiplus \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy published files from build stage
COPY --from=build /app/publish .

# Expose port from environment variable (Render sets PORT)
ENV ASPNETCORE_URLS=http://+:${PORT:-5000}
ENV ASPNETCORE_ENVIRONMENT=Production

# Health check for Render
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Run the application
ENTRYPOINT ["dotnet", "MyApi.dll"]