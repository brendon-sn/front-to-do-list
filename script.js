const addTaskButton = document.getElementById('addTaskButton')
const taskModal = document.getElementById('taskModal')
const closeModal = document.getElementById('closeModal')
const taskForm = document.getElementById('taskForm')
const taskList = document.getElementById('taskList')
const deleteModal = document.getElementById('deleteModal')
const closeDeleteModal = document.getElementById('closeDeleteModal')
const confirmDeleteButton = document.getElementById('confirmDeleteButton')
const cancelDeleteButton = document.getElementById('cancelDeleteButton')
const errorMessageDiv = document.getElementById('errorMessage')
const modalTitle = document.getElementById('modalTitle')
const API_URL = 'https://to-do-list-ppj7.onrender.com'
let nextOrder = 1
let tasks = []
let draggedItem = null
let taskToDeleteIndex = null
let taskToEditIndex = null

function dateLock() {
    const today = new Date().toISOString().split('T')[0]
    document.getElementById('taskDeadline').setAttribute('min', today)
}

addTaskButton.addEventListener('click', () => {
    taskModal.style.display = 'block'
    taskForm.reset()
    taskToEditIndex = null
    errorMessageDiv.style.display = 'none'
    modalTitle.textContent = 'Adicionar Nova Tarefa'
    dateLock()
})

closeModal.addEventListener('click', () => {
    taskModal.style.display = 'none'
})

async function createTask(task) {
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(task)
        })

        if (!response.ok) throw new Error('Erro ao criar tarefa')
        return await response.json()

    } catch (error) {
        console.error('Erro ao criar tarefa:', error)
        return null
    }
}

taskForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    const taskName = document.getElementById('taskName').value
    const taskCost = parseFloat(document.getElementById('taskCost').value)
    const taskDeadline = document.getElementById('taskDeadline').value

    const taskExists = tasks.some((task, index) => task.name === taskName && index !== taskToEditIndex)

    if (taskExists) {
        errorMessageDiv.textContent = 'Já existe uma tarefa com esse nome. Por favor, escolha outro!'
        errorMessageDiv.style.display = 'block'
        return
    }
    errorMessageDiv.style.display = 'none'

    if (taskToEditIndex !== null) {
        const updatedTask = {
            id: tasks[taskToEditIndex].id,
            name: taskName,
            cost: taskCost,
            deadline: taskDeadline,
            order: tasks[taskToEditIndex].order
        }
        await updateTask(updatedTask)
        tasks[taskToEditIndex] = updatedTask
    } else {
        const newTask = {
            name: taskName,
            cost: taskCost,
            deadline: taskDeadline,
            order: nextOrder
        }

        const createdTask = await createTask(newTask)
        
        if (createdTask && createdTask.id) {
            tasks.push(createdTask)
            nextOrder++
        }
    }
    
    updateTaskList()
    taskForm.reset()
    taskModal.style.display = 'none'
    window.location.reload()
})

async function updateTask(task) {
    try {
        const response = await fetch(`${API_URL}/tasks/${task.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...task,
                deadline: new Date(task.deadline.split('/').reverse().join('-')).toISOString()
            })
        })
        if (!response.ok) throw new Error('Erro ao atualizar tarefa')
        return await response.json()
    } catch (error) {
        console.error('Erro ao atualizar tarefa:', error)
    }
}

function updateTaskList() {
    taskList.innerHTML = ''
    tasks.sort((a, b) => a.order - b.order)

    tasks.forEach((task, index) => {
        const newRow = document.createElement('tr')
        newRow.setAttribute('draggable', true)
        newRow.dataset.index = index

        
        if (task.cost >= 1000) {
            newRow.classList.add('high-cost')
        }

        const formattedDate = new Intl.DateTimeFormat('pt-BR').format(new Date(task.deadline))

        newRow.innerHTML = 
        `
            <td>${task.id}</td>
            <td>${task.name}</td>
            <td>${task.cost.toFixed(2)}</td>
            <td>${formattedDate}</td>
            <td>
                <button class="editButton" onclick="editTask(${index})">✏️</button>
                <button class="deleteButton" onclick="openDeleteModal(${index})">🗑️</button>
            </td>
        `

        newRow.addEventListener('dragstart', (e) => {
            draggedItem = newRow
            setTimeout(() => {
                newRow.style.display = 'none'
            }, 0)
        })

        newRow.addEventListener('dragend', () => {
            draggedItem = null
            newRow.style.display = 'table-row'
        })

        newRow.addEventListener('dragover', (e) => {
            e.preventDefault()
        })

        newRow.addEventListener('drop', (e) => {
            e.preventDefault()
            if (draggedItem && draggedItem !== newRow) {
                const draggedIndex = parseInt(draggedItem.dataset.index)
                const targetIndex = index
                const draggedTask = tasks[draggedIndex]
                tasks.splice(draggedIndex, 1)
                tasks.splice(targetIndex, 0, draggedTask)
                tasks.forEach((task, i) => task.order = i + 1)
                updateTaskList()
            }
        })
        taskList.appendChild(newRow)
    })
}

function editTask(index) {
    const task = tasks[index]
    document.getElementById('taskName').value = task.name
    document.getElementById('taskCost').value = task.cost

    const date = new Date(task.deadline)
    const offset = date.getTimezoneOffset() * 60 * 1000
    const localDate = new Date(date.getTime() + offset)
    
    const formattedDate = localDate.toISOString().split('T')[0]
    document.getElementById('taskDeadline').value = formattedDate

    taskToEditIndex = index
    taskModal.style.display = 'block'
    errorMessageDiv.style.display = 'none'
    modalTitle.textContent = 'Editar Tarefa'
    dateLock()
}

function openDeleteModal(index) {
    taskToDeleteIndex = index
    deleteModal.style.display = 'block'
}

closeDeleteModal.addEventListener('click', () => {
    deleteModal.style.display = 'none'
})

confirmDeleteButton.addEventListener('click', async () => {
    if (taskToDeleteIndex !== null) {
        const taskId = tasks[taskToDeleteIndex].id
        await deleteTask(taskId)
        tasks.splice(taskToDeleteIndex, 1)
        updateTaskList()
        deleteModal.style.display = 'none'
    }
})

async function deleteTask(taskId) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error('Erro ao excluir tarefa')
    } catch (error) {
        console.error('Erro ao excluir tarefa:', error)
    }
}

cancelDeleteButton.addEventListener('click', () => {
    deleteModal.style.display = 'none'
})

async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`)
        tasks = await response.json()
        updateTaskList()
    } catch (error) {
        console.error('Erro ao carregar as tarefas:', error)
    }
}

loadTasks()