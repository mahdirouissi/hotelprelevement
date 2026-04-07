# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY MyApi/MyApi.csproj ./MyApi/
RUN dotnet restore MyApi/MyApi.csproj

# Copy all source files
COPY MyApi/ ./MyApi/

# Build the application
WORKDIR /src/MyApi
RUN dotnet publish -c Release -o /app/publish --no-restore

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Install libgdiplus for QuestPDF (required for PDF generation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdiplus \
    && rm -rf /var/lib/apt/lists/*

# Copy published files from build stage
COPY --from=build /app/publish .

# Expose port 5000 for the API
EXPOSE 5000

# Set environment variables
ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

# Default command to run the application
ENTRYPOINT ["dotnet", "MyApi.dll"]