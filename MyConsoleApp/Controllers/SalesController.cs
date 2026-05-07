using Microsoft.AspNetCore.Mvc;
using MyConsoleApp.Models;
using MyConsoleApp.Services;

namespace MyConsoleApp.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SalesController : ControllerBase
{
    private readonly DataService _dataService;

    public SalesController(DataService dataService) => _dataService = dataService;

    [HttpGet]
    public IActionResult GetAll()
    {
        var sales = _dataService.GetSales()
            .OrderByDescending(s => s.SaleDate)
            .ToList();
        return Ok(sales);
    }

    [HttpPost]
    public IActionResult Create([FromBody] SaleRecord sale)
    {
        var medicines = _dataService.GetMedicines();
        var medicine = medicines.FirstOrDefault(m => m.Id == sale.MedicineId);
        if (medicine is null)
            return BadRequest(new { message = "Medicine not found." });
        if (medicine.Quantity < sale.QuantitySold)
            return BadRequest(new { message = $"Insufficient stock. Available: {medicine.Quantity}" });

        // Deduct stock
        medicine.Quantity -= sale.QuantitySold;
        _dataService.SaveMedicines(medicines);

        // Populate and save sale record
        sale.Id = Guid.NewGuid().ToString();
        sale.SaleDate = DateTime.Now;
        sale.MedicineName = medicine.FullName;
        sale.Brand = medicine.Brand;
        sale.UnitPrice = medicine.Price;
        sale.TotalAmount = medicine.Price * sale.QuantitySold;

        var sales = _dataService.GetSales();
        sales.Add(sale);
        _dataService.SaveSales(sales);

        return CreatedAtAction(null, new { id = sale.Id }, sale);
    }
}
