const orderList = document.getElementById("orderList");

async function loadOrders() {
  const res = await fetch("/api/orders");
  const orders = await res.json();

  orderList.innerHTML = "";
  orders.forEach((order) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${order.item}</strong> for ${order.customerName} - ${order.address}
      <button onclick="acceptOrder('${order.id}')">Accept</button>
    `;
    orderList.appendChild(li);
  });
}

async function acceptOrder(orderId) {
  const riderName = document.getElementById("riderName").value;

  if (!riderName) {
    alert("Please enter your name first.");
    return;
  }

  const res = await fetch(`/api/orders/${orderId}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ riderName }),
  });

  const data = await res.json();
  alert(data.message);
  loadOrders();
}
