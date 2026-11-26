using System.Text.Json;
using System.Text.RegularExpressions;

namespace StudyAI.Features.Content;

/// <summary>
/// Closed, versioned validator for P03 LessonContentBlock payloads.
/// Rejects unknown types, unsupported schema versions, unknown properties,
/// unsafe URLs, missing accessibility text, non-rectangular tables, and excessive size/depth.
/// </summary>
public static partial class LessonContentBlockValidator
{
    public const int CurrentSchemaVersion = 1;
    public const int MaxBlocksPerLesson = 200;
    public const int MaxPayloadChars = 65_536;
    public const int MaxJsonDepth = 10;

    public static readonly IReadOnlySet<string> AllowedBlockTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "text",
        "markdown",
        "formula",
        "image",
        "video",
        "example",
        "exercise",
        "table",
        "diagram",
        "timeline",
        "summary",
        "reference"
    };

    private static readonly IReadOnlySet<string> AllowedDiagramFormats = new HashSet<string>(StringComparer.Ordinal)
    {
        "mermaid",
        "svg-ref",
        "structured"
    };

    [GeneratedRegex(@"<\s*script\b|javascript:|on\w+\s*=", RegexOptions.IgnoreCase)]
    private static partial Regex UnsafeMarkupRegex();

    public static string ValidateAndNormalizePayload(LessonContentBlockInputDto input, int index)
    {
        if (input is null)
        {
            throw new ValidationException($"blocks[{index}]", "Block payload cannot be null.");
        }

        var blockType = (input.BlockType ?? string.Empty).Trim();
        if (!AllowedBlockTypes.Contains(blockType))
        {
            throw new ValidationException($"blocks[{index}].blockType", $"Unsupported block type '{input.BlockType}'.");
        }

        if (input.SchemaVersion != CurrentSchemaVersion)
        {
            throw new ValidationException(
                $"blocks[{index}].schemaVersion",
                $"Unsupported schema version {input.SchemaVersion} for block type '{blockType}'.");
        }

        if (input.Payload.ValueKind != JsonValueKind.Object)
        {
            throw new ValidationException($"blocks[{index}].payload", "Block payload must be a JSON object.");
        }

        var rawJson = input.Payload.GetRawText();
        if (rawJson.Length > MaxPayloadChars)
        {
            throw new ValidationException($"blocks[{index}].payload", $"Block payload exceeds maximum size of {MaxPayloadChars} characters.");
        }

        if (GetJsonDepth(input.Payload) > MaxJsonDepth)
        {
            throw new ValidationException($"blocks[{index}].payload", $"Block payload exceeds maximum JSON depth of {MaxJsonDepth}.");
        }

        var fieldPrefix = $"blocks[{index}].payload";
        switch (blockType)
        {
            case "text":
                RejectUnknownProperties(input.Payload, fieldPrefix, "content");
                RequireNonEmptyString(input.Payload, "content", fieldPrefix);
                break;

            case "markdown":
                RejectUnknownProperties(input.Payload, fieldPrefix, "content");
                var md = RequireNonEmptyString(input.Payload, "content", fieldPrefix);
                if (UnsafeMarkupRegex().IsMatch(md))
                {
                    throw new ValidationException($"{fieldPrefix}.content", "Markdown content contains disallowed script or inline event handler.");
                }
                break;

            case "formula":
                RejectUnknownProperties(input.Payload, fieldPrefix, "latex", "displayMode", "caption");
                RequireNonEmptyString(input.Payload, "latex", fieldPrefix);
                OptionalBoolean(input.Payload, "displayMode", fieldPrefix);
                OptionalString(input.Payload, "caption", fieldPrefix);
                break;

            case "image":
                RejectUnknownProperties(input.Payload, fieldPrefix, "url", "alt", "caption");
                var imgUrl = RequireNonEmptyString(input.Payload, "url", fieldPrefix);
                ValidateSafeUrl(imgUrl, $"{fieldPrefix}.url", allowRelativeUploads: true);
                RequireNonEmptyString(input.Payload, "alt", fieldPrefix);
                OptionalString(input.Payload, "caption", fieldPrefix);
                break;

            case "video":
                RejectUnknownProperties(input.Payload, fieldPrefix, "url", "title", "provider", "durationSeconds");
                var vidUrl = RequireNonEmptyString(input.Payload, "url", fieldPrefix);
                ValidateSafeUrl(vidUrl, $"{fieldPrefix}.url", allowRelativeUploads: false);
                RequireNonEmptyString(input.Payload, "title", fieldPrefix);
                OptionalString(input.Payload, "provider", fieldPrefix);
                OptionalNonNegativeInt(input.Payload, "durationSeconds", fieldPrefix);
                break;

            case "example":
                RejectUnknownProperties(input.Payload, fieldPrefix, "title", "prompt", "solution");
                RequireNonEmptyString(input.Payload, "title", fieldPrefix);
                RequireNonEmptyString(input.Payload, "prompt", fieldPrefix);
                OptionalString(input.Payload, "solution", fieldPrefix);
                break;

            case "exercise":
                RejectUnknownProperties(input.Payload, fieldPrefix, "prompt", "hint", "solution", "answerKey");
                RequireNonEmptyString(input.Payload, "prompt", fieldPrefix);
                OptionalString(input.Payload, "hint", fieldPrefix);
                OptionalString(input.Payload, "solution", fieldPrefix);
                OptionalString(input.Payload, "answerKey", fieldPrefix);
                break;

            case "table":
                RejectUnknownProperties(input.Payload, fieldPrefix, "headers", "rows", "caption");
                ValidateTable(input.Payload, fieldPrefix);
                OptionalString(input.Payload, "caption", fieldPrefix);
                break;

            case "diagram":
                RejectUnknownProperties(input.Payload, fieldPrefix, "format", "source", "alt", "caption");
                var fmt = RequireNonEmptyString(input.Payload, "format", fieldPrefix);
                if (!AllowedDiagramFormats.Contains(fmt))
                {
                    throw new ValidationException($"{fieldPrefix}.format", $"Unsupported diagram format '{fmt}'.");
                }
                RequireNonEmptyString(input.Payload, "source", fieldPrefix);
                RequireNonEmptyString(input.Payload, "alt", fieldPrefix);
                OptionalString(input.Payload, "caption", fieldPrefix);
                break;

            case "timeline":
                RejectUnknownProperties(input.Payload, fieldPrefix, "events", "caption");
                ValidateTimeline(input.Payload, fieldPrefix);
                OptionalString(input.Payload, "caption", fieldPrefix);
                break;

            case "summary":
                RejectUnknownProperties(input.Payload, fieldPrefix, "title", "points");
                OptionalString(input.Payload, "title", fieldPrefix);
                RequireNonEmptyStringArray(input.Payload, "points", fieldPrefix);
                break;

            case "reference":
                RejectUnknownProperties(input.Payload, fieldPrefix, "label", "url", "citation");
                RequireNonEmptyString(input.Payload, "label", fieldPrefix);
                var refUrl = OptionalString(input.Payload, "url", fieldPrefix);
                if (!string.IsNullOrWhiteSpace(refUrl))
                {
                    ValidateSafeUrl(refUrl, $"{fieldPrefix}.url", allowRelativeUploads: false);
                }
                OptionalString(input.Payload, "citation", fieldPrefix);
                break;
        }

        return rawJson;
    }

    /// <summary>
    /// Strips protected exercise answer fields before projecting blocks to learners.
    /// </summary>
    public static JsonElement SanitizePayloadForLearner(string blockType, JsonElement payload)
    {
        if (!string.Equals(blockType, "exercise", StringComparison.Ordinal) ||
            payload.ValueKind != JsonValueKind.Object)
        {
            return payload;
        }

        using var ms = new MemoryStream();
        using (var writer = new Utf8JsonWriter(ms))
        {
            writer.WriteStartObject();
            foreach (var prop in payload.EnumerateObject())
            {
                if (string.Equals(prop.Name, "solution", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(prop.Name, "answerKey", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }
                prop.WriteTo(writer);
            }
            writer.WriteEndObject();
        }

        using var doc = JsonDocument.Parse(ms.ToArray());
        return doc.RootElement.Clone();
    }

    private static void RejectUnknownProperties(JsonElement obj, string fieldPrefix, params string[] allowed)
    {
        var allowedSet = new HashSet<string>(allowed, StringComparer.Ordinal);
        foreach (var prop in obj.EnumerateObject())
        {
            if (!allowedSet.Contains(prop.Name))
            {
                throw new ValidationException($"{fieldPrefix}.{prop.Name}", $"Unknown property '{prop.Name}' is not allowed.");
            }
        }
    }

    private static string RequireNonEmptyString(JsonElement obj, string propName, string fieldPrefix)
    {
        if (!obj.TryGetProperty(propName, out var prop) || prop.ValueKind != JsonValueKind.String)
        {
            throw new ValidationException($"{fieldPrefix}.{propName}", $"'{propName}' must be a non-empty string.");
        }
        var val = prop.GetString()?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(val))
        {
            throw new ValidationException($"{fieldPrefix}.{propName}", $"'{propName}' cannot be empty.");
        }
        return val;
    }

    private static string? OptionalString(JsonElement obj, string propName, string fieldPrefix)
    {
        if (!obj.TryGetProperty(propName, out var prop) || prop.ValueKind == JsonValueKind.Null)
        {
            return null;
        }
        if (prop.ValueKind != JsonValueKind.String)
        {
            throw new ValidationException($"{fieldPrefix}.{propName}", $"'{propName}' must be a string.");
        }
        return prop.GetString();
    }

    private static void OptionalBoolean(JsonElement obj, string propName, string fieldPrefix)
    {
        if (!obj.TryGetProperty(propName, out var prop) || prop.ValueKind == JsonValueKind.Null)
        {
            return;
        }
        if (prop.ValueKind != JsonValueKind.True && prop.ValueKind != JsonValueKind.False)
        {
            throw new ValidationException($"{fieldPrefix}.{propName}", $"'{propName}' must be a boolean.");
        }
    }

    private static void OptionalNonNegativeInt(JsonElement obj, string propName, string fieldPrefix)
    {
        if (!obj.TryGetProperty(propName, out var prop) || prop.ValueKind == JsonValueKind.Null)
        {
            return;
        }
        if (prop.ValueKind != JsonValueKind.Number || !prop.TryGetInt32(out var val) || val < 0)
        {
            throw new ValidationException($"{fieldPrefix}.{propName}", $"'{propName}' must be a non-negative integer.");
        }
    }

    private static List<string> RequireNonEmptyStringArray(JsonElement obj, string propName, string fieldPrefix)
    {
        if (!obj.TryGetProperty(propName, out var prop) || prop.ValueKind != JsonValueKind.Array)
        {
            throw new ValidationException($"{fieldPrefix}.{propName}", $"'{propName}' must be a non-empty array.");
        }
        var list = new List<string>();
        var i = 0;
        foreach (var item in prop.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(item.GetString()))
            {
                throw new ValidationException($"{fieldPrefix}.{propName}[{i}]", $"'{propName}[{i}]' must be a non-empty string.");
            }
            list.Add(item.GetString()!.Trim());
            i++;
        }
        if (list.Count == 0)
        {
            throw new ValidationException($"{fieldPrefix}.{propName}", $"'{propName}' must contain at least one item.");
        }
        return list;
    }

    private static void ValidateTable(JsonElement obj, string fieldPrefix)
    {
        var headers = RequireNonEmptyStringArray(obj, "headers", fieldPrefix);
        if (!obj.TryGetProperty("rows", out var rowsProp) || rowsProp.ValueKind != JsonValueKind.Array)
        {
            throw new ValidationException($"{fieldPrefix}.rows", "'rows' must be an array.");
        }
        var rowIndex = 0;
        foreach (var row in rowsProp.EnumerateArray())
        {
            if (row.ValueKind != JsonValueKind.Array)
            {
                throw new ValidationException($"{fieldPrefix}.rows[{rowIndex}]", "Each table row must be an array.");
            }
            var cellCount = 0;
            foreach (var cell in row.EnumerateArray())
            {
                if (cell.ValueKind != JsonValueKind.String)
                {
                    throw new ValidationException($"{fieldPrefix}.rows[{rowIndex}][{cellCount}]", "Table cell must be a string.");
                }
                cellCount++;
            }
            if (cellCount != headers.Count)
            {
                throw new ValidationException(
                    $"{fieldPrefix}.rows[{rowIndex}]",
                    $"Table row {rowIndex} has {cellCount} cells, expected {headers.Count} to match headers.");
            }
            rowIndex++;
        }
    }

    private static void ValidateTimeline(JsonElement obj, string fieldPrefix)
    {
        if (!obj.TryGetProperty("events", out var eventsProp) || eventsProp.ValueKind != JsonValueKind.Array)
        {
            throw new ValidationException($"{fieldPrefix}.events", "'events' must be a non-empty array.");
        }
        var count = 0;
        foreach (var ev in eventsProp.EnumerateArray())
        {
            if (ev.ValueKind != JsonValueKind.Object)
            {
                throw new ValidationException($"{fieldPrefix}.events[{count}]", "Timeline event must be an object.");
            }
            RejectUnknownProperties(ev, $"{fieldPrefix}.events[{count}]", "date", "title", "description");
            RequireNonEmptyString(ev, "date", $"{fieldPrefix}.events[{count}]");
            RequireNonEmptyString(ev, "title", $"{fieldPrefix}.events[{count}]");
            OptionalString(ev, "description", $"{fieldPrefix}.events[{count}]");
            count++;
        }
        if (count == 0)
        {
            throw new ValidationException($"{fieldPrefix}.events", "'events' must contain at least one event.");
        }
    }

    private static void ValidateSafeUrl(string url, string fieldName, bool allowRelativeUploads)
    {
        if (allowRelativeUploads && url.StartsWith("/uploads/", StringComparison.Ordinal))
        {
            return;
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
        {
            throw new ValidationException(fieldName, $"URL '{url}' must use http:// or https://.");
        }
    }

    private static int GetJsonDepth(JsonElement element, int currentDepth = 1)
    {
        if (currentDepth > MaxJsonDepth) return currentDepth;
        var max = currentDepth;
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in element.EnumerateObject())
            {
                max = Math.Max(max, GetJsonDepth(prop.Value, currentDepth + 1));
                if (max > MaxJsonDepth) return max;
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                max = Math.Max(max, GetJsonDepth(item, currentDepth + 1));
                if (max > MaxJsonDepth) return max;
            }
        }
        return max;
    }
}
