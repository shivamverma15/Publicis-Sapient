using Microsoft.AspNetCore.Mvc;
using MyConsoleApp.Models;
using MyConsoleApp.Services;

namespace MyConsoleApp.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MedicinesController : ControllerBase
{
    private readonly DataService _dataService;

    public MedicinesController(DataService dataService) => _dataService = dataService;

    [HttpGet]
    public IActionResult GetAll([FromQuery] string? search)
    {
        var medicines = _dataService.GetMedicines();
        if (!string.IsNullOrWhiteSpace(search))
            medicines = medicines
                .Where(m => m.FullName.Contains(search, StringComparison.OrdinalIgnoreCase))
                .ToList();
        return Ok(medicines);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(string id)
    {
        var medicine = _dataService.GetMedicines().FirstOrDefault(m => m.Id == id);
        return medicine is null ? NotFound() : Ok(medicine);
    }

    [HttpPost]
    public IActionResult Create([FromBody] Medicine medicine)
    {
        medicine.Id = Guid.NewGuid().ToString();
        var medicines = _dataService.GetMedicines();
        medicines.Add(medicine);
        _dataService.SaveMedicines(medicines);
        return CreatedAtAction(nameof(GetById), new { id = medicine.Id }, medicine);
    }

    [HttpPut("{id}")]
    public IActionResult Update(string id, [FromBody] Medicine medicine)
    {
        var medicines = _dataService.GetMedicines();
        var index = medicines.FindIndex(m => m.Id == id);
        if (index == -1) return NotFound();
        medicine.Id = id;
        medicines[index] = medicine;
        _dataService.SaveMedicines(medicines);
        return Ok(medicine);
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(string id)
    {
        var medicines = _dataService.GetMedicines();
        var medicine = medicines.FirstOrDefault(m => m.Id == id);
        if (medicine is null) return NotFound();
        medicines.Remove(medicine);
        _dataService.SaveMedicines(medicines);
        return NoContent();
    }
}
