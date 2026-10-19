# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /build
COPY NimbusSales.Crm.Api/NimbusSales.Crm.Api.csproj NimbusSales.Crm.Api/
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore NimbusSales.Crm.Api/NimbusSales.Crm.Api.csproj
COPY NimbusSales.Crm.Api/ NimbusSales.Crm.Api/
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish NimbusSales.Crm.Api/NimbusSales.Crm.Api.csproj \
    -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 5080
ENTRYPOINT ["dotnet", "NimbusSales.Crm.Api.dll"]
