import { useState, useEffect } from "react";

export default function App() {
  const [ordenes, setOrdenes] = useState(() => {
    const data = localStorage.getItem("ordenes");
    return data ? JSON.parse(data) : [];
  });

  const [carwash, setCarwash] = useState(() => {
    const data = localStorage.getItem("carwash");
    return data ? JSON.parse(data) : [];
  });

  const [cliente, setCliente] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [mecanico, setMecanico] = useState("");
  const [lavador, setLavador] = useState("");

  const mecanicos = ["Juan", "Pedro"];
  const lavadores = ["Luis", "Carlos"];

  useEffect(() => {
    localStorage.setItem("ordenes", JSON.stringify(ordenes));
  }, [ordenes]);

  useEffect(() => {
    localStorage.setItem("carwash", JSON.stringify(carwash));
  }, [carwash]);

  const crearOrden = () => {
    const total = 200;
    const comision = total * 0.1;

    const nueva = {
      id: Date.now(),
      cliente,
      vehiculo,
      mecanico,
      estado: "En proceso",
      total,
      comision
    };

    setOrdenes([nueva, ...ordenes]);
    setCliente("");
    setVehiculo("");
    setMecanico("");
  };

  const avanzarOrden = (id) => {
    setOrdenes(
      ordenes.map((o) =>
        o.id === id
          ? {
              ...o,
              estado: o.estado === "En proceso" ? "Listo" : "Cobrado"
            }
          : o
      )
    );
  };

  const agregarLavado = (tipo, precio) => {
    const nuevo = {
      id: Date.now(),
      tipo,
      precio,
      lavador,
      estado: "En proceso",
      comision: 5
    };

    setCarwash([nuevo, ...carwash]);
    setLavador("");
  };

  const avanzarLavado = (id) => {
    setCarwash(
      carwash.map((c) =>
        c.id === id
          ? {
              ...c,
              estado: c.estado === "En proceso" ? "Listo" : "Cobrado"
            }
          : c
      )
    );
  };

  const totalTaller = ordenes.reduce((acc, o) => acc + o.total, 0);
  const totalCarwash = carwash.reduce((acc, c) => acc + c.precio, 0);

  return (
    <div style={{ padding: 20 }}>
      <h1>Los Pits App</h1>

      <h2>Taller</h2>
      <input placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
      <br />
      <input placeholder="Vehículo" value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} />
      <br />

      <select value={mecanico} onChange={(e) => setMecanico(e.target.value)}>
        <option value="">Seleccionar mecánico</option>
        {mecanicos.map((m, i) => (
          <option key={i}>{m}</option>
        ))}
      </select>

      <br />
      <button onClick={crearOrden}>Crear Orden</button>

      <h3>Órdenes</h3>
      {ordenes.map((o) => (
        <div key={o.id} style={{ border: "1px solid black", margin: 10, padding: 10 }}>
          <p>{o.cliente}</p>
          <p>{o.vehiculo}</p>
          <p>Mecánico: {o.mecanico}</p>
          <p>Total: Q{o.total}</p>
          <p>Comisión: Q{o.comision}</p>
          <p>Estado: {o.estado}</p>
          <button onClick={() => avanzarOrden(o.id)}>Avanzar</button>
        </div>
      ))}

      <hr />

      <h2>Carwash</h2>

      <select value={lavador} onChange={(e) => setLavador(e.target.value)}>
        <option value="">Seleccionar lavador</option>
        {lavadores.map((l, i) => (
          <option key={i}>{l}</option>
        ))}
      </select>

      <br />
      <button onClick={() => agregarLavado("Pequeño", 70)}>Pequeño Q70</button>
      <button onClick={() => agregarLavado("Mediano", 90)}>Mediano Q90</button>
      <button onClick={() => agregarLavado("Grande", 110)}>Grande Q110</button>

      <h3>Lavados</h3>
      {carwash.map((c) => (
        <div key={c.id} style={{ border: "1px solid blue", margin: 10, padding: 10 }}>
          <p>{c.tipo}</p>
          <p>Lavador: {c.lavador}</p>
          <p>Precio: Q{c.precio}</p>
          <p>Comisión: Q{c.comision}</p>
          <p>Estado: {c.estado}</p>
          <button onClick={() => avanzarLavado(c.id)}>Avanzar</button>
        </div>
      ))}

      <hr />

      <h2>Resumen</h2>
      <p>Total Taller: Q{totalTaller}</p>
      <p>Total Carwash: Q{totalCarwash}</p>
      <p>Total General: Q{totalTaller + totalCarwash}</p>
    </div>
  );
}