# ---------- Stage 1: Build ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files
COPY . .

# Restore & publish
RUN dotnet restore MyApi.csproj
RUN dotnet publish MyApi.csproj -c Release -o /app/publish

# ---------- Stage 2: Runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Install required library (for PDF/graphics)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdiplus \
    && rm -rf /var/lib/apt/lists/*

# Copy published output
COPY --from=build /app/publish .

# Expose port
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

# Run the application
ENTRYPOINT ["dotnet", "MyApi.dll"]