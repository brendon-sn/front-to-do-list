document.addEventListener('DOMContentLoaded', loadTasks)
const confirmDeleteButton = document.getElementById('confirmDeleteButton')
const addTaskButton = document.getElementById('addTaskButton')
const taskModal = document.getElementById('taskModal')
const closeModal = document.getElementById('closeModal')
const taskForm = document.getElementById('taskForm')
const errorMessageDiv = document.getElementById('errorMessage')
const modalTitle = document.getElementById('modalTitle')
const API_URL = 'https://to-do-list-ppj7.onrender.com'

let tasks = []
let nextOrder = 1
let taskToEditIndex = null

async function loadTasks() {
    try {
        const resp = await fetch(`${API_URL}/tasks`)
        if (resp.status === 200) {
            tasks = await resp.json()
            updateTaskList(tasks)
        } else {
            exibirMensagemErro(`Erro ao carregar dados: Status ${resp.status}`)
        }
    } catch (error) {
        exibirMensagemErro('Erro ao listar os itens: ' + error.message)
    }
}

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

window.addEventListener('click', (event) => {
    if (event.target === taskModal) {
        taskModal.style.display = 'none'
    }
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

function updateTaskList(itens) {
    const tbody = document.getElementById('taskList')
    tbody.innerHTML = ''
    itens.sort((a, b) => a.order - b.order)

    itens.forEach((item, index) => {
        const tr = document.createElement('tr')
        tr.setAttribute('draggable', true)
        tr.dataset.index = index

        const data = new Date(item.deadline)
        const formattedDate = data.toLocaleDateString('pt-BR', { timeZone: 'UTC' })

        const formattedCost = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(item.cost)

        if (item.cost >= 1000) {
            tr.classList.add('high-cost')
        }

        tr.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${formattedCost}</td>
            <td>${formattedDate}</td>
            <td class="actions">
                <button onclick="editTask(${index})" class="editButton">✏️</button>
                <button onclick="openDeleteModal(${index})" class="deleteButton">🗑️</button>
            </td>
            <td>
                <button onclick="moveTaskUp(${index})" class="upButton" ${index === 0 ? 'disabled' : ''}>
                    <span class="arrow up"></span>
                </button>
                <button onclick="moveTaskDown(${index})" class="downButton" ${index === itens.length - 1 ? 'disabled' : ''}>
                    <span class="arrow down"></span>
                </button>
            </td>
        `

        tr.addEventListener('dragstart', (e) => {
            draggedItem = tr
            setTimeout(() => {
                tr.style.display = 'none'
            }, 0)
        })

        tr.addEventListener('dragend', () => {
            draggedItem = null
            tr.style.display = 'table-row'
        })

        tr.addEventListener('dragover', (e) => {
            e.preventDefault()
        })

        tr.addEventListener('drop', (e) => {
            e.preventDefault()
            if (draggedItem && draggedItem !== tr) {
                const draggedIndex = parseInt(draggedItem.dataset.index)
                const targetIndex = index
                const draggedTask = tasks[draggedIndex]
                tasks.splice(draggedIndex, 1)
                tasks.splice(targetIndex, 0, draggedTask)
                tasks.forEach((task, i) => task.order = i + 1)
                updateTaskList(tasks)
            }
        })

        tbody.appendChild(tr)
    })
}

function moveTaskUp(index) {
    if (index > 0) {
        const temp = tasks[index - 1]
        tasks[index - 1] = tasks[index]
        tasks[index] = temp
        tasks[index].order = index + 1
        tasks[index - 1].order = index
        updateTaskList(tasks)
    }
}

function moveTaskDown(index) {
    if (index < tasks.length - 1) {
        const temp = tasks[index + 1]
        tasks[index + 1] = tasks[index]
        tasks[index] = temp
        tasks[index].order = index + 1
        tasks[index + 1].order = index + 2
        updateTaskList(tasks)
    }
}

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
            order: nextOrder++
        }

        const createdTask = await createTask(newTask)
        
        if (createdTask && createdTask.id) {
            tasks.push(createdTask)
        }
    }
    
    updateTaskList(tasks)
    taskForm.reset()
    taskModal.style.display = 'none'
    window.location.reload()
})

function editTask(index) {
    const task = tasks[index]
    document.getElementById('taskName').value = task.name
    document.getElementById('taskCost').value = task.cost

    const date = new Date(task.deadline)
    const offset = date.getTimezoneOffset() * 60 * 1000
    const localDate = new Date(date.getTime() + offset)
    
    document.getElementById('taskDeadline').value = localDate.toISOString().split('T')[0]

    taskToEditIndex = index
    taskModal.style.display = 'block'
    errorMessageDiv.style.display = 'none'
    modalTitle.textContent = 'Editar Tarefa'
    dateLock()
}

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
        deleteModal.style.display = 'none'
        
        loadTasks()
    }
})

cancelDeleteButton.addEventListener('click', () => {
    deleteModal.style.display = 'none'
})