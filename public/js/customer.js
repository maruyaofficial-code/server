const orderForm = document.getElementById("orderForm");
const message = document.getElementById("message");

orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const orderData = {
    customerName: document.getElementById("customerName").value,
    item: document.getElementById("item").value,
    address: document.getElementById("address").value,
  };

  const res = await fetch("/api/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });

  const data = await res.json();
  message.textContent = data.message;
  orderForm.reset();
});
