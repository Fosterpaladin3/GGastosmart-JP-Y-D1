# Implementación de Sistema de Abonos a Metas

## Resumen Ejecutivo

Se ha implementado un sistema completo para manejar los abonos a metas como **transferencias internas**, separándolos correctamente de ingresos y gastos.

## Cambios Implementados

### 1. Backend - Modelo de Transacciones

**Archivo**: `models/transaction.py`

- Agregado nuevo tipo de transacción: `GOAL_CONTRIBUTION = "goal_contribution"`
- Este tipo representa transferencias internas que no son ingresos ni gastos

### 2. Backend - Operaciones de Metas

**Archivo**: `database/goal_operations.py`

**Cambios**:
- Constructor actualizado para recibir `transactions_collection`
- Métodos `contribute_to_main_goal` y `contribute_to_goal` ahora:
  - Actualizan el progreso de la meta
  - Crean una transacción de tipo `goal_contribution`
  - Registran metadata: `goal_id`, `goal_name`, `category`

**Estructura de transacción de abono**:
```python
{
    "user_id": str,
    "type": "goal_contribution",
    "amount": float,
    "category": str,  # Categoría de la meta
    "description": str,
    "date": datetime,
    "created_at": datetime,
    "currency": "COP",
    "goal_id": str,
    "goal_name": str
}
```

### 3. Backend - Router de Metas

**Archivo**: `routers/goals.py`

- `get_goal_operations` ahora pasa `transactions_collection` al constructor de `GoalOperations`
- Esto permite que los abonos se registren automáticamente como transacciones

### 4. Frontend - Cálculo de Saldo

**Archivo**: `components/DashboardCards.jsx`

**Lógica actualizada**:
```javascript
// Ingresos: solo transaction_type === 'income'
const income = transactions
  .filter(t => t.transaction_type === 'income')
  .reduce((sum, t) => sum + t.amount, 0)

// Gastos: solo transaction_type === 'expense'
const expense = transactions
  .filter(t => t.transaction_type === 'expense')
  .reduce((sum, t) => sum + t.amount, 0)

// Abonos a metas: transaction_type === 'goal_contribution'
const goalContributions = transactions
  .filter(t => t.transaction_type === 'goal_contribution' || t.type === 'goal_contribution')
  .reduce((sum, t) => sum + t.amount, 0)

// Saldo disponible = presupuesto + ingresos - gastos - abonos
const balance = budget + income - expense - goalContributions
```

### 5. Frontend - Validación de Saldo

**Archivo**: `pages/Goals.jsx`

**Nuevas funcionalidades**:

1. **Cálculo de saldo disponible**:
   ```javascript
   const calculateAvailableBalance = async () => {
     const balance = initialBudget + income - expenses - contributions
     setAvailableBalance(balance)
   }
   ```

2. **Validación antes de abonar**:
   ```javascript
   if (amount > availableBalance) {
     errors.amount = `Saldo insuficiente. Disponible: ${formatCurrency(availableBalance)}`
   }
   ```

3. **Actualización automática**: El saldo se recalcula después de cada operación

### 6. Script de Migración

**Archivo**: `scripts/migrate_goal_contributions.py`

**Propósito**: Corregir transacciones históricas mal etiquetadas

**Funcionalidad**:
- Busca transacciones de tipo `income` con descripciones que mencionen "abono", "contribución", "ahorro a meta"
- Verifica si tienen `goal_id` asociado
- Re-etiqueta como `goal_contribution`
- Marca con flag `migrated: true`

**Ejecución**:
```bash
cd GastoSmart-Backend
python -m scripts.migrate_goal_contributions
```

## Reglas de Negocio Implementadas

### 1. Saldo Disponible
```
Saldo Disponible = Presupuesto Inicial + Ingresos - Gastos - Abonos a Metas
```

### 2. Abono a Meta
- ✅ Disminuye el saldo disponible
- ✅ Aumenta el `current_amount` de la meta
- ✅ Actualiza el `progress_percentage`
- ✅ Se registra como transacción tipo `goal_contribution`
- ✅ NO se cuenta como ingreso
- ✅ NO se cuenta como gasto

### 3. Validaciones
- ✅ El abono no puede exceder el saldo disponible
- ✅ El abono no puede exceder el monto restante de la meta
- ✅ El abono debe ser mayor a 0

### 4. Ahorro Total
- En Dashboard: Suma de TODOS los abonos a TODAS las metas
- En Goals: Suma de abonos solo a metas categoría "Ahorros"

## Flujo de Abono

```
1. Usuario ingresa monto en formulario
   ↓
2. Frontend valida:
   - Monto > 0
   - Monto ≤ Saldo Disponible
   - Monto ≤ Monto Restante de Meta
   ↓
3. Frontend llama API: POST /goals/{goal_id}/contribute
   ↓
4. Backend (goal_operations.py):
   a. Actualiza meta: current_amount += monto
   b. Recalcula progress_percentage
   c. Crea transacción tipo "goal_contribution"
   ↓
5. Frontend recarga:
   - Metas (progreso actualizado)
   - Saldo disponible (disminuido)
   - Dashboard (ahorro total actualizado)
```

## Impacto en Reportes

Los reportes deben:
- ✅ Excluir `goal_contribution` de agregados de ingresos
- ✅ Excluir `goal_contribution` de agregados de gastos
- ✅ Mostrar `goal_contribution` en categoría separada "Ahorro" o "Metas"

## Testing Manual

### Caso 1: Abono Exitoso
1. Verificar saldo disponible en Dashboard
2. Ir a Metas → Abonar a una meta
3. Ingresar monto válido (< saldo disponible, < monto restante)
4. Confirmar
5. **Verificar**:
   - Saldo disponible disminuyó
   - Progreso de meta aumentó
   - Ahorro total aumentó
   - Transacción aparece en historial con tipo `goal_contribution`

### Caso 2: Validación de Saldo Insuficiente
1. Verificar saldo disponible
2. Intentar abonar monto mayor al saldo
3. **Verificar**: Mensaje de error "Saldo insuficiente. Disponible: $X"

### Caso 3: Validación de Monto Excedente
1. Ver monto restante de una meta
2. Intentar abonar más del monto restante
3. **Verificar**: Mensaje de error "El monto no puede superar el monto restante"

### Caso 4: Migración de Datos
1. Ejecutar script de migración
2. Verificar logs: transacciones corregidas
3. Verificar en MongoDB: tipo cambiado a `goal_contribution`
4. Verificar Dashboard: saldo recalculado correctamente

## Monitoreo y Logs

Los logs incluyen:
- `"Transacción de abono registrada para meta {goal_id}"`
- `"Saldo disponible calculado: {balance}"`
- `"Error al registrar transacción de abono: {error}"`

## Próximos Pasos (Opcional)

1. **Retiros de Metas**: Implementar funcionalidad inversa
2. **Reportes Detallados**: Gráficas específicas de contribuciones por meta
3. **Notificaciones**: Alertas cuando saldo es insuficiente
4. **Historial**: Vista detallada de todos los abonos por meta

## Notas Técnicas

- Las transacciones de tipo `goal_contribution` incluyen campos adicionales:
  - `goal_id`: ID de la meta
  - `goal_name`: Nombre de la meta
  - `category`: Categoría de la meta
- El campo `type` puede ser `goal_contribution` o `transaction_type` puede ser `goal_contribution` (compatibilidad)
- La migración marca transacciones corregidas con `migrated: true`

## Compatibilidad

- ✅ Compatible con datos existentes
- ✅ Script de migración disponible
- ✅ No rompe funcionalidad existente
- ✅ Backward compatible con transacciones antiguas
