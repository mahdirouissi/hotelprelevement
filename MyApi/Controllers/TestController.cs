using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApi.Models;

namespace MyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TestController : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = $"{Roles.Admin},{Roles.User},{Roles.Visiteur}")]
    public ActionResult<IEnumerable<string>> Get()
    {
        return new string[] { "Test 1", "Test 2", "Test 3" };
    }

    [HttpGet("{id}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.User},{Roles.Visiteur}")]
    public ActionResult<string> Get(int id)
    {
        return $"Test item {id}";
    }

    [HttpPost]
    [Authorize(Roles = $"{Roles.Admin},{Roles.User}")]
    public ActionResult<string> Post([FromBody] string value)
    {
        return CreatedAtAction(nameof(Get), new { id = 1 }, value);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public IActionResult Put(int id, [FromBody] string value)
    {
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public IActionResult Delete(int id)
    {
        return NoContent();
    }
}
