using System.Security.Cryptography;
using System.Text;
using Konscious.Security.Cryptography;
using StudyAI.Application.Common.Interfaces;

namespace StudyAI.Infrastructure.Security;

public class Argon2PasswordHasher : IPasswordHasher
{
    private const int DegreeOfParallelism = 1;
    private const int Iterations = 2;
    private const int MemorySize = 19456;
    private const int SaltSize = 16;
    private const int HashSize = 32;

    public string HashPassword(string plainPassword)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);

        using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(plainPassword))
        {
            Salt = salt,
            DegreeOfParallelism = DegreeOfParallelism,
            Iterations = Iterations,
            MemorySize = MemorySize
        };

        byte[] hash = argon2.GetBytes(HashSize);

        string saltB64 = Convert.ToBase64String(salt).TrimEnd('=');
        string hashB64 = Convert.ToBase64String(hash).TrimEnd('=');

        return $"$argon2id$v=19$m={MemorySize},t={Iterations},p={DegreeOfParallelism}${saltB64}${hashB64}";
    }

    public bool VerifyPassword(string plainPassword, string hashedPassword)
    {
        if (string.IsNullOrWhiteSpace(plainPassword) || string.IsNullOrWhiteSpace(hashedPassword))
        {
            return false;
        }

        try
        {
            if (hashedPassword.StartsWith("$argon2"))
            {
                var parts = hashedPassword.Split('$', StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 4) return false;

                // parts[0]: argon2id
                // parts[1]: v=19
                // parts[2]: m=...,t=...,p=...
                // parts[3]: salt
                // parts[4]: hash

                int m = MemorySize;
                int t = Iterations;
                int p = DegreeOfParallelism;

                var paramTokens = parts[2].Split(',');
                foreach (var token in paramTokens)
                {
                    var kv = token.Split('=');
                    if (kv.Length == 2)
                    {
                        if (kv[0] == "m") int.TryParse(kv[1], out m);
                        else if (kv[0] == "t") int.TryParse(kv[1], out t);
                        else if (kv[0] == "p") int.TryParse(kv[1], out p);
                    }
                }

                byte[] salt = DecodeBase64(parts[3]);
                byte[] expectedHash = DecodeBase64(parts[4]);

                using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(plainPassword))
                {
                    Salt = salt,
                    DegreeOfParallelism = p,
                    Iterations = t,
                    MemorySize = m
                };

                byte[] actualHash = argon2.GetBytes(expectedHash.Length);
                return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
            }
        }
        catch
        {
            return false;
        }

        return false;
    }

    private static byte[] DecodeBase64(string base64)
    {
        string padded = base64.PadRight(base64.Length + (4 - base64.Length % 4) % 4, '=');
        return Convert.FromBase64String(padded);
    }
}
