using System.Text.Json;
using MyConsoleApp.Models;

namespace MyConsoleApp.Services;

public class DataService
{
    private readonly string _medicinesPath;
    private readonly string _salesPath;
    private readonly object _lock = new();
    private readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true };

    public DataService(IWebHostEnvironment env)
    {
        var dataPath = Path.Combine(env.ContentRootPath, "Data");
        Directory.CreateDirectory(dataPath);
        _medicinesPath = Path.Combine(dataPath, "medicines.json");
        _salesPath = Path.Combine(dataPath, "sales.json");

        if (!File.Exists(_medicinesPath))
            File.WriteAllText(_medicinesPath, "[]");
        if (!File.Exists(_salesPath))
            File.WriteAllText(_salesPath, "[]");
    }

    public List<Medicine> GetMedicines()
    {
        lock (_lock)
        {
            var json = File.ReadAllText(_medicinesPath);
            return JsonSerializer.Deserialize<List<Medicine>>(json) ?? [];
        }
    }

    public void SaveMedicines(List<Medicine> medicines)
    {
        lock (_lock)
        {
            File.WriteAllText(_medicinesPath, JsonSerializer.Serialize(medicines, _jsonOptions));
        }
    }

    public List<SaleRecord> GetSales()
    {
        lock (_lock)
        {
            var json = File.ReadAllText(_salesPath);
            return JsonSerializer.Deserialize<List<SaleRecord>>(json) ?? [];
        }
    }

    public void SaveSales(List<SaleRecord> sales)
    {
        lock (_lock)
        {
            File.WriteAllText(_salesPath, JsonSerializer.Serialize(sales, _jsonOptions));
        }
    }
}
