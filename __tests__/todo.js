const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;

const extractCSRFToken = (html) => {
  const $ = cheerio.load(html);
  return $("[name=_csrf]").val();
};

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};


describe("Todo Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(5000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Log in", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "john",
      lastName: "Doe",
      email: "user.a@test.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Log out", async () => {
    let res = await agent.get("/todos");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/todos");
    expect(res.statusCode).toBe(302);
  });

  test("One user cannot mark as complete/incomplete a todo of other user", async () => {
    //create UserA account
    let res = await agent.get("/signup");
    let csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Test",
      lastName: "User A",
      email: "userA@test.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    //create Todo from UserA account
    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);
    res = await agent.post("/todos").send({
      title: "Buy a car",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const idOfTodoFromUserA = res.id;
    //Signout UserA
    await agent.get("/signout");
    //Create UserB account
    res = await agent.get("/signup");
    csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Test",
      lastName: "User B",
      email: "userB@test.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    //Try markAsComplete on UserA Todo from UserB account
    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);
    const markCompleteResponse = await agent
      .put(`/todos/${idOfTodoFromUserA}`)
      .send({
        _csrf: csrfToken,
        completed: true,
      });
    expect(markCompleteResponse.statusCode).toBe(422);
    //Try markAsIncomplete on UserA Todo from UserB account
    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);
    const markIncompleteResponse = await agent
      .put(`/todos/${idOfTodoFromUserA}`)
      .send({
        _csrf: csrfToken,
        completed: false,
      });
    expect(markIncompleteResponse.statusCode).toBe(422);
  });

  test("One user cannot delete todo of other user", async () => {
    //create UserA account
    let res = await agent.get("/signup");
    let csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Test",
      lastName: "User C",
      email: "userC@test.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    //create Todo from UserA account
    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);
    res = await agent.post("/todos").send({
      title: "Buy a pen",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const idOfTodoFromUserA = res.id;
    //Signout UserA
    await agent.get("/signout");
    //Create UserB account
    res = await agent.get("/signup");
    csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Test",
      lastName: "User D",
      email: "userD@test.com",
      password: "12345678",
      _csrf: csrfToken,
    });

    //Try delete on UserA Todo from UserB account
    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);
    const deleteResponse2 = await agent
      .delete(`/todos/${idOfTodoFromUserA}`)
      .send({
        _csrf: csrfToken,
      });
    expect(deleteResponse2.statusCode).toBe(422);
  });

  test("Create new todo", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678");
    const { text } = await agent.get("/todos");
    const csrfToken = extractCSRFToken(text);

    const response = await agent.post("/todos").send({
      title: "Renew gym membership",
      dueDate: new Date().toISOString(),
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Mark todo as complete", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "password");
    let res = await agent.get("/todos");
    let csrfToken = extractCSRFToken(res.text);
    await agent.post("/todos").send({
      title: "read a book",
      dueDate: new Date().toISOString(),
      _csrf: csrfToken,
    });

    const groupedTodos = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedResponse = JSON.parse(groupedTodos.text);
    const lastItem = parsedResponse[parsedResponse.length - 1];

    res = await agent.get("/todos");
    csrfToken = extractCSRFToken(res.text);

    const markCompleteResponse = await agent.put(`/todos/${lastItem.id}`).send({
      _csrf: csrfToken,
      completed: true,
    });

    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });
  
  test("Mark todo as incomplete", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCSRFToken(res.text);
    await agent.post("/todos").send({
      title: "read a book",
      dueDate: new Date().toISOString(),
      _csrf: csrfToken,
    });

    const groupedTodos = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedResponse = JSON.parse(groupedTodos.text);
    const lastItem = parsedResponse[parsedResponse.length - 1];

    res = await agent.get("/");
    csrfToken = extractCSRFToken(res.text);

    const markCompleteResponse = await agent.put(`/todos/${lastItem.id}`).send({
      _csrf: csrfToken,
      completed: false,
    });

    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(false);
  });

  test("Marks a todo as incomplete", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "password");
    const groupedTodos = await agent
      .get("/alltodos")
      .set("Accept", "application/json");
    const parsedResponse = JSON.parse(groupedTodos.text);
    const completeItem = parsedResponse.find((item) => item.completed === true);

    const res = await agent.get("/todos");
    const csrfToken = extractCSRFToken(res.text);

    const markIncompleteResponse = await agent
      .put(`/todos/${completeItem.id}`)
      .send({
        _csrf: csrfToken,
        completed: false,
      });

    const parsedIncompleteResponse = JSON.parse(markIncompleteResponse.text);
    expect(parsedIncompleteResponse.completed).toBe(false);
  });

  test("Delete todo", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCSRFToken(res.text);

    await agent.post("/todos").send({
      title: "recharge mobile",
      dueDate: new Date().toISOString(),
      _csrf: csrfToken,
    });

    const response = await agent.get("/todos");
    const parsedResponse = JSON.parse(response.text);
    const todoID = parsedResponse[parsedResponse.length - 1].id;

    res = await agent.get("/");
    csrfToken = extractCSRFToken(res.text);

    const deleteResponse = await agent.delete(`/todos/${todoID}`).send({
      _csrf: csrfToken,
    });
    expect(deleteResponse.statusCode).toBe(200);
  });
});
