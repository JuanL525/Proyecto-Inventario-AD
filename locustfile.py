from locust import HttpUser, task, between
from collections import Counter
import threading

nodo_counter = Counter()
lock = threading.Lock()


class VoltioUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def ping_balanceador(self):
        with self.client.get("/api/ping", catch_response=True) as response:
            if response.status_code == 200:
                nodo = response.json().get("nodo", "desconocido")
                with lock:
                    nodo_counter[nodo] += 1
                response.success()
            else:
                response.failure(f"Status code inesperado: {response.status_code}")

    @task(2)
    def consultar_catalogo(self):
        self.client.get("/api/componentes")


from locust import events

@events.quitting.add_listener
def mostrar_distribucion_nodos(environment, **kwargs):
    total = sum(nodo_counter.values())
    print("\n" + "=" * 50)
    print("DISTRIBUCION DE TRAFICO POR NODO (balanceo por pesos)")
    print("=" * 50)
    if total == 0:
        print("No se registraron peticiones a /api/ping")
    else:
        for nodo, count in nodo_counter.most_common():
            porcentaje = (count / total) * 100
            print(f"  {nodo}: {count} peticiones ({porcentaje:.1f}%)")
    print("=" * 50 + "\n")
