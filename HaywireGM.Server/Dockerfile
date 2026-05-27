# ===========================================
# HaywireGM.Server - Local Development Dockerfile
# ===========================================
# Multi-stage build for ASP.NET Core backend

# Base stage for Visual Studio debugging
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER app
WORKDIR /app
EXPOSE 8080

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Debug
WORKDIR /src

# Copy project files
COPY ["HaywireGM.Server/HaywireGM.Server.csproj", "HaywireGM.Server/"]
COPY ["HaywireGM.Business/HaywireGM.Business.csproj", "HaywireGM.Business/"]
COPY ["HaywireGM.Data/HaywireGM.Data.csproj", "HaywireGM.Data/"]
COPY ["HaywireGM.Contracts/HaywireGM.Contracts.csproj", "HaywireGM.Contracts/"]
COPY ["HaywireGM.ServiceDefaults/HaywireGM.ServiceDefaults.csproj", "HaywireGM.ServiceDefaults/"]

# Restore dependencies
RUN dotnet restore "HaywireGM.Server/HaywireGM.Server.csproj"

# Copy source code
COPY . .

# Build the application
WORKDIR "/src/HaywireGM.Server"
RUN dotnet build "HaywireGM.Server.csproj" -c $BUILD_CONFIGURATION -o /app/build

# Publish stage
FROM build AS publish
ARG BUILD_CONFIGURATION=Debug
RUN dotnet publish "HaywireGM.Server.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM base AS final
WORKDIR /app

# Copy published application
COPY --from=publish /app/publish .

# Expose port
EXPOSE 8080

# Run the application
ENTRYPOINT ["dotnet", "HaywireGM.Server.dll"]
