using Aura.Application.DTOs.Images;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Aura.Application.Services.Images;

public class ImageService : IImageService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<ImageService>? _logger;
    private readonly string _connectionString;

    // File validation constants
    private const long MaxFileSize = 50 * 1024 * 1024; // 50MB
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".dicom", ".dcm" };
    private static readonly string[] AllowedMimeTypes = { 
        "image/jpeg", "image/jpg", "image/png", 
        "application/dicom", "application/octet-stream" 
    };

    public ImageService(IConfiguration configuration, ILogger<ImageService>? logger = null)
    {
        _configuration = configuration;
        _logger = logger;
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("Database connection string not found");
    }

    public async Task<ImageUploadResponseDto> UploadImageAsync(
        string userId,
        Stream fileStream,
        string originalFilename,
        ImageUploadDto? metadata = null,
        string? userEmail = null,
        string? firstName = null,
        string? lastName = null)
    {
        // Reset stream position to beginning
        if (fileStream.CanSeek)
        {
            fileStream.Position = 0;
        }

        // Validate file
        ValidateFile(originalFilename, fileStream.Length);

        // Generate unique filename
        var fileExtension = Path.GetExtension(originalFilename).ToLowerInvariant();
        var storedFilename = GenerateUniqueFilename(fileExtension);
        var imageId = Guid.NewGuid().ToString();

        // Determine image type from metadata or filename
        var imageType = DetermineImageType(originalFilename, metadata?.ImageType);

        try
        {
            // Reset stream position again before upload
            if (fileStream.CanSeek)
            {
                fileStream.Position = 0;
            }

            // Upload to Cloudinary
            var cloudinaryUrl = await UploadToCloudinaryAsync(fileStream, storedFilename, imageType);

            // Save to database
            await SaveImageToDatabaseAsync(imageId, userId, originalFilename, storedFilename, 
                cloudinaryUrl, fileStream.Length, imageType, metadata, userEmail, firstName, lastName);

            _logger?.LogInformation("Image uploaded successfully: {ImageId}, User: {UserId}", imageId, userId);

            return new ImageUploadResponseDto
            {
                Id = imageId,
                OriginalFilename = originalFilename,
                CloudinaryUrl = cloudinaryUrl,
                FileSize = fileStream.Length,
                ImageType = imageType,
                UploadStatus = "Uploaded",
                UploadedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error uploading image: {Filename}", originalFilename);
            throw new InvalidOperationException($"Failed to upload image: {ex.Message}", ex);
        }
    }

    public async Task<MultipleImageUploadResponseDto> UploadMultipleImagesAsync(
        string userId,
        List<(Stream FileStream, string Filename, ImageUploadDto? Metadata)> files)
    {
        var response = new MultipleImageUploadResponseDto();

        foreach (var (fileStream, filename, metadata) in files)
        {
            try
            {
                var result = await UploadImageAsync(userId, fileStream, filename, metadata);
                response.SuccessfullyUploaded.Add(result);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error uploading image: {Filename}", filename);
                response.Failed.Add(new ImageUploadErrorDto
                {
                    Filename = filename,
                    ErrorMessage = ex.Message
                });
            }
        }

        return response;
    }

    private void ValidateFile(string filename, long fileSize)
    {
        // Check file extension
        var extension = Path.GetExtension(filename).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            throw new ArgumentException(
                $"File type not allowed. Supported formats: {string.Join(", ", AllowedExtensions)}");
        }

        // Check file size
        if (fileSize > MaxFileSize)
        {
            throw new ArgumentException(
                $"File size exceeds maximum allowed size of {MaxFileSize / (1024 * 1024)}MB");
        }

        if (fileSize == 0)
        {
            throw new ArgumentException("File is empty");
        }
    }

    private string DetermineImageType(string filename, string? metadataType)
    {
        if (!string.IsNullOrWhiteSpace(metadataType))
        {
            return metadataType.Equals("OCT", StringComparison.OrdinalIgnoreCase) ? "OCT" : "Fundus";
        }

        // Try to determine from filename
        var lowerFilename = filename.ToLowerInvariant();
        if (lowerFilename.Contains("oct") || lowerFilename.EndsWith(".dcm") || lowerFilename.EndsWith(".dicom"))
        {
            return "OCT";
        }

        return "Fundus"; // Default
    }

    private string GenerateUniqueFilename(string extension)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
        var random = Guid.NewGuid().ToString("N")[..8];
        return $"retinal_{timestamp}_{random}{extension}";
    }

    private async Task<string> UploadToCloudinaryAsync(Stream fileStream, string filename, string imageType)
    {
        var cloudName = _configuration["Cloudinary:CloudName"];
        var apiKey = _configuration["Cloudinary:ApiKey"];
        var apiSecret = _configuration["Cloudinary:ApiSecret"];

        if (string.IsNullOrWhiteSpace(cloudName) || 
            string.IsNullOrWhiteSpace(apiKey) || 
            string.IsNullOrWhiteSpace(apiSecret))
        {
            _logger?.LogWarning("Cloudinary credentials not configured, using placeholder URL");
            // Return placeholder URL for development
            return $"https://placeholder.aura-health.com/{filename}";
        }

        // TODO: Implement actual Cloudinary upload
        // For now, return a placeholder URL
        // In production, use Cloudinary .NET SDK:
        // var uploadParams = new ImageUploadParams { File = new FileDescription(filename, fileStream) };
        // var uploadResult = await cloudinary.UploadAsync(uploadParams);
        // return uploadResult.SecureUrl;

        _logger?.LogInformation("Uploading to Cloudinary: {Filename}", filename);
        
        // Placeholder - replace with actual Cloudinary SDK call
        await Task.Delay(100); // Simulate upload delay
        
        return $"https://res.cloudinary.com/{cloudName}/image/upload/v1/aura/retinal-images/{filename}";
    }

    public async Task<ImageUploadResponseDto> UploadImageForClinicAsync(
        string clinicId,
        Stream fileStream,
        string originalFilename,
        ImageUploadDto? metadata = null,
        string? patientUserId = null,
        string? doctorId = null)
    {
        // Reset stream position to beginning
        if (fileStream.CanSeek)
        {
            fileStream.Position = 0;
        }

        // Validate file
        ValidateFile(originalFilename, fileStream.Length);

        // Generate unique filename
        var fileExtension = Path.GetExtension(originalFilename).ToLowerInvariant();
        var storedFilename = GenerateUniqueFilename(fileExtension);
        var imageId = Guid.NewGuid().ToString();

        // Determine image type from metadata or filename
        var imageType = DetermineImageType(originalFilename, metadata?.ImageType);

        try
        {
            // Reset stream position again before upload
            if (fileStream.CanSeek)
            {
                fileStream.Position = 0;
            }

            // Upload to Cloudinary
            var cloudinaryUrl = await UploadToCloudinaryAsync(fileStream, storedFilename, imageType);

            // Save to database with clinic info
            await SaveImageToDatabaseForClinicAsync(imageId, clinicId, patientUserId, doctorId,
                originalFilename, storedFilename, cloudinaryUrl, fileStream.Length, imageType, metadata);

            _logger?.LogInformation("Image uploaded successfully for clinic: {ImageId}, Clinic: {ClinicId}", imageId, clinicId);

            return new ImageUploadResponseDto
            {
                Id = imageId,
                OriginalFilename = originalFilename,
                CloudinaryUrl = cloudinaryUrl,
                FileSize = fileStream.Length,
                ImageType = imageType,
                UploadStatus = "Uploaded",
                UploadedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error uploading image for clinic: {Filename}", originalFilename);
            throw new InvalidOperationException($"Failed to upload image: {ex.Message}", ex);
        }
    }

    public async Task<ClinicBulkUploadResponseDto> BulkUploadForClinicAsync(
        string clinicId,
        List<(Stream FileStream, string Filename, ImageUploadDto? Metadata)> files,
        ClinicBulkUploadDto? options = null)
    {
        var batchId = Guid.NewGuid().ToString();
        var response = new ClinicBulkUploadResponseDto
        {
            BatchId = batchId,
            TotalFiles = files.Count,
            UploadedAt = DateTime.UtcNow
        };

        _logger?.LogInformation("Starting bulk upload for clinic {ClinicId}, Batch: {BatchId}, Files: {Count}",
            clinicId, batchId, files.Count);

        // Process files in parallel batches (max 10 concurrent uploads to avoid overwhelming Cloudinary)
        const int batchSize = 10;
        var semaphore = new SemaphoreSlim(batchSize);

        var uploadTasks = files.Select(async (file, index) =>
        {
            await semaphore.WaitAsync();
            try
            {
                // Merge common metadata with file-specific metadata
                var metadata = options?.CommonMetadata ?? file.Metadata;
                if (file.Metadata != null && metadata != null)
                {
                    // File-specific metadata overrides common metadata
                    metadata.ImageType = file.Metadata.ImageType ?? metadata.ImageType;
                    metadata.EyeSide = file.Metadata.EyeSide ?? metadata.EyeSide;
                    metadata.CaptureDevice = file.Metadata.CaptureDevice ?? metadata.CaptureDevice;
                    metadata.CaptureDate = file.Metadata.CaptureDate ?? metadata.CaptureDate;
                }

                var result = await UploadImageForClinicAsync(
                    clinicId,
                    file.FileStream,
                    file.Filename,
                    metadata,
                    options?.PatientUserId,
                    options?.DoctorId
                );

                response.SuccessfullyUploaded.Add(result);
                response.SuccessCount++;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error uploading image in bulk: {Filename}", file.Filename);
                response.Failed.Add(new ImageUploadErrorDto
                {
                    Filename = file.Filename,
                    ErrorMessage = ex.Message
                });
                response.FailedCount++;
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(uploadTasks);

        _logger?.LogInformation("Bulk upload completed for clinic {ClinicId}, Batch: {BatchId}, Success: {Success}, Failed: {Failed}",
            clinicId, batchId, response.SuccessCount, response.FailedCount);

        return response;
    }

    private async Task SaveImageToDatabaseAsync(
        string imageId,
        string userId,
        string originalFilename,
        string storedFilename,
        string cloudinaryUrl,
        long fileSize,
        string imageType,
        ImageUploadDto? metadata,
        string? userEmail = null,
        string? firstName = null,
        string? lastName = null)
    {
        // Verify user exists before inserting
        using var connection = new Npgsql.NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        // Check if user exists, if not create a basic user record
        var checkUserSql = "SELECT COUNT(1) FROM users WHERE Id = @UserId AND IsDeleted = false";
        using var checkUserCommand = new Npgsql.NpgsqlCommand(checkUserSql, connection);
        checkUserCommand.Parameters.AddWithValue("UserId", userId);
        var userExists = Convert.ToInt32(await checkUserCommand.ExecuteScalarAsync()) > 0;

        if (!userExists)
        {
            _logger?.LogWarning("User {UserId} does not exist in database, creating basic user record", userId);
            
            // Create a basic user record to allow image upload
            var createUserSql = @"
                INSERT INTO users (
                    Id, Email, FirstName, LastName, PasswordHash, 
                    IsEmailVerified, IsActive, CreatedDate, IsDeleted
                ) VALUES (
                    @Id, @Email, @FirstName, @LastName, @PasswordHash,
                    @IsEmailVerified, @IsActive, @CreatedDate, @IsDeleted
                )";
            
            using var createUserCommand = new Npgsql.NpgsqlCommand(createUserSql, connection);
            createUserCommand.Parameters.AddWithValue("Id", userId);
            createUserCommand.Parameters.AddWithValue("Email", userEmail ?? $"user_{userId.Substring(0, 8)}@aura.local");
            createUserCommand.Parameters.AddWithValue("FirstName", firstName ?? "User");
            createUserCommand.Parameters.AddWithValue("LastName", lastName ?? userId.Substring(0, 8));
            createUserCommand.Parameters.AddWithValue("PasswordHash", "N/A"); // OAuth users don't have password
            createUserCommand.Parameters.AddWithValue("IsEmailVerified", false);
            createUserCommand.Parameters.AddWithValue("IsActive", true);
            createUserCommand.Parameters.AddWithValue("CreatedDate", DateTime.UtcNow.Date);
            createUserCommand.Parameters.AddWithValue("IsDeleted", false);
            
            try
            {
                await createUserCommand.ExecuteNonQueryAsync();
                _logger?.LogInformation("Created basic user record for {UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Failed to create user record for {UserId}", userId);
                throw new InvalidOperationException($"User with ID {userId} does not exist and could not be created: {ex.Message}");
            }
        }

        var sql = @"
            INSERT INTO retinal_images (
                Id, UserId, OriginalFilename, StoredFilename, FilePath, 
                CloudinaryUrl, FileSize, ImageType, ImageFormat, 
                CaptureDevice, CaptureDate, EyeSide, UploadStatus, 
                UploadedAt, CreatedDate, IsDeleted
            ) VALUES (
                @Id, @UserId, @OriginalFilename, @StoredFilename, @FilePath,
                @CloudinaryUrl, @FileSize, @ImageType, @ImageFormat,
                @CaptureDevice, @CaptureDate, @EyeSide, @UploadStatus,
                @UploadedAt, @CreatedDate, @IsDeleted
            )";

        var imageFormat = DetermineImageFormat(originalFilename);
        var filePath = $"aura/retinal-images/{storedFilename}";

        using var command = new Npgsql.NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("Id", imageId);
        command.Parameters.AddWithValue("UserId", userId);
        command.Parameters.AddWithValue("OriginalFilename", originalFilename);
        command.Parameters.AddWithValue("StoredFilename", storedFilename);
        command.Parameters.AddWithValue("FilePath", filePath);
        command.Parameters.AddWithValue("CloudinaryUrl", cloudinaryUrl);
        command.Parameters.AddWithValue("FileSize", fileSize);
        command.Parameters.AddWithValue("ImageType", imageType);
        command.Parameters.AddWithValue("ImageFormat", imageFormat);
        command.Parameters.AddWithValue("CaptureDevice", (object?)metadata?.CaptureDevice ?? DBNull.Value);
        command.Parameters.AddWithValue("CaptureDate", (object?)metadata?.CaptureDate ?? DBNull.Value);
        command.Parameters.AddWithValue("EyeSide", (object?)metadata?.EyeSide ?? DBNull.Value);
        command.Parameters.AddWithValue("UploadStatus", "Uploaded");
        command.Parameters.AddWithValue("UploadedAt", DateTime.UtcNow);
        command.Parameters.AddWithValue("CreatedDate", DateTime.UtcNow.Date);
        command.Parameters.AddWithValue("IsDeleted", false);

        await command.ExecuteNonQueryAsync();
    }

    private async Task SaveImageToDatabaseForClinicAsync(
        string imageId,
        string clinicId,
        string? patientUserId,
        string? doctorId,
        string originalFilename,
        string storedFilename,
        string cloudinaryUrl,
        long fileSize,
        string imageType,
        ImageUploadDto? metadata)
    {
        using var connection = new Npgsql.NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        // Use patientUserId if provided, otherwise create a placeholder user ID
        var userId = patientUserId ?? Guid.NewGuid().ToString();

        var sql = @"
            INSERT INTO retinal_images (
                Id, UserId, ClinicId, DoctorId, OriginalFilename, StoredFilename, FilePath, 
                CloudinaryUrl, FileSize, ImageType, ImageFormat, 
                CaptureDevice, CaptureDate, EyeSide, UploadStatus, 
                UploadedAt, CreatedDate, IsDeleted
            ) VALUES (
                @Id, @UserId, @ClinicId, @DoctorId, @OriginalFilename, @StoredFilename, @FilePath,
                @CloudinaryUrl, @FileSize, @ImageType, @ImageFormat,
                @CaptureDevice, @CaptureDate, @EyeSide, @UploadStatus,
                @UploadedAt, @CreatedDate, @IsDeleted
            )";

        var imageFormat = DetermineImageFormat(originalFilename);
        var filePath = $"aura/retinal-images/{storedFilename}";

        using var command = new Npgsql.NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("Id", imageId);
        command.Parameters.AddWithValue("UserId", userId);
        command.Parameters.AddWithValue("ClinicId", clinicId);
        command.Parameters.AddWithValue("DoctorId", (object?)doctorId ?? DBNull.Value);
        command.Parameters.AddWithValue("OriginalFilename", originalFilename);
        command.Parameters.AddWithValue("StoredFilename", storedFilename);
        command.Parameters.AddWithValue("FilePath", filePath);
        command.Parameters.AddWithValue("CloudinaryUrl", cloudinaryUrl);
        command.Parameters.AddWithValue("FileSize", fileSize);
        command.Parameters.AddWithValue("ImageType", imageType);
        command.Parameters.AddWithValue("ImageFormat", imageFormat);
        command.Parameters.AddWithValue("CaptureDevice", (object?)metadata?.CaptureDevice ?? DBNull.Value);
        command.Parameters.AddWithValue("CaptureDate", (object?)metadata?.CaptureDate ?? DBNull.Value);
        command.Parameters.AddWithValue("EyeSide", (object?)metadata?.EyeSide ?? DBNull.Value);
        command.Parameters.AddWithValue("UploadStatus", "Uploaded");
        command.Parameters.AddWithValue("UploadedAt", DateTime.UtcNow);
        command.Parameters.AddWithValue("CreatedDate", DateTime.UtcNow.Date);
        command.Parameters.AddWithValue("IsDeleted", false);

        await command.ExecuteNonQueryAsync();
    }

    private string DetermineImageFormat(string filename)
    {
        var extension = Path.GetExtension(filename).ToLowerInvariant();
        return extension switch
        {
            ".jpg" or ".jpeg" => "JPEG",
            ".png" => "PNG",
            ".dcm" or ".dicom" => "DICOM",
            _ => "JPEG"
        };
    }
}

