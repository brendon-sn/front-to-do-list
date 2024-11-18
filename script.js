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
let taskToDeleteIndex = null

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

addTaskButton.addEventListener('click', () => {
    taskModal.style.display = 'block'
    taskForm.reset()
    taskToEditIndex = null
    errorMessageDiv.style.display = 'none'
    modalTitle.textContent = 'Adicionar Nova Tarefa'
    document.getElementById('taskName').focus()
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
        const { id, order, ...taskWithoutOrder } = task

        console.log('Enviando tarefa para criação:', taskWithoutOrder)

        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskWithoutOrder)
        })

        const responseText = await response.text()
        console.log('Resposta da API (texto):', responseText)

        if (!response.ok) {
            throw new Error(`Erro ao criar tarefa: ${response.status} - ${responseText}`)
        }

        return responseText ? JSON.parse(responseText) : null
    } catch (error) {
        console.error('Erro ao criar tarefa:', error.message)
        return null
    }
}

async function updateTaskList(itens) {
    const tbody = document.getElementById('taskList')
    tbody.innerHTML = ''
    itens.sort((a, b) => a.order - b.order)

    itens.forEach((item, index) => {
        const tr = document.createElement('tr')
        tr.dataset.index = index

        const data = new Date(item.deadline)
        const formattedDate = data.toLocaleDateString('pt-BR', { timeZone: 'UTC' })

        const formattedCost = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
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
                <button class="editButton">
                    <img src="assets/edit.svg" alt="">
                </button>
                <button class="deleteButton">
                    <img src="assets/delete.svg" alt="">
                </button>
            </td>
            <td>
                <button class="upButton" ${index === 0 ? 'disabled' : ''}>
                    <span class="arrow up"></span>
                </button>
                <button class="downButton" ${index === itens.length - 1 ? 'disabled' : ''}>
                    <span class="arrow down"></span>
                </button>
            </td>
        `

        const editButton = tr.querySelector('.editButton')
        const deleteButton = tr.querySelector('.deleteButton')
        const upButton = tr.querySelector('.upButton')
        const downButton = tr.querySelector('.downButton')
        editButton.addEventListener('click', () => editTask(index))
        deleteButton.addEventListener('click', () => openDeleteModal(index))
        upButton.addEventListener('click', () => moveTaskUp(index))
        downButton.addEventListener('click', () => moveTaskDown(index))

        tbody.appendChild(tr)
    })
}

async function moveTaskUp(index) {
    if (index > 0) {
        const currentTask = tasks[index]

        try {
            const url = `${API_URL}/tasks/${currentTask.id}/move?direction=up`
            const response = await fetch(url, {
                method: 'PUT',
            })

            if (!response.ok) {
                const responseText = await response.text()
                throw new Error(`Erro ao mover tarefa para cima: ${response.status} - ${responseText}`)
            }

            loadTasks()
        } catch (error) {
            console.error('Erro ao mover tarefa para cima:', error.message)
        }
    }
}

async function moveTaskDown(index) {
    if (index < tasks.length - 1) {
        const currentTask = tasks[index]

        try {
            const url = `${API_URL}/tasks/${currentTask.id}/move?direction=down`
            const response = await fetch(url, {
                method: 'PUT',
            })

            if (!response.ok) {
                const responseText = await response.text()
                throw new Error(`Erro ao mover tarefa para baixo: ${response.status} - ${responseText}`)
            }

            loadTasks()
        } catch (error) {
            console.error('Erro ao mover tarefa para baixo:', error)
        }
    }
}

async function updateTask(task) {
    try {
        const { id, ...taskWithoutOrder } = task
        const response = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskWithoutOrder)
        })

        if (response.status === 204) {
            console.log('Tarefa atualizada com sucesso (sem resposta JSON)')
            return null
        }

        const responseText = await response.text()
        console.log('Resposta da API (texto bruto):', responseText)

        if (!response.ok) throw new Error(`Erro ao atualizar tarefa: ${response.status}`)
        return responseText ? JSON.parse(responseText) : null
    } catch (error) {
        console.error('Erro ao atualizar tarefa:', error.message)
        return null
    }
}

taskForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    const taskName = document.getElementById('taskName').value
    const taskCost = parseFloat(document.getElementById('taskCost').value)
    const taskDeadline = document.getElementById('taskDeadline').value

    const taskExists = tasks.some((task, index) => task.name.toLowerCase() === taskName.toLowerCase() && index !== taskToEditIndex)

    if (taskExists) {
        errorMessageDiv.textContent = 'Já existe uma tarefa com esse nome. Por favor, escolha outro!'
        errorMessageDiv.style.display = 'block'
        return
    } 

    errorMessageDiv.style.display = 'none'

    const taskData = {
        name: taskName,
        cost: taskCost,
        deadline: taskDeadline
    }

    try {
        let responseData
        if (taskToEditIndex !== null) {
            const updatedTask = {
                id: tasks[taskToEditIndex].id,
                ...taskData
            }
            responseData = await updateTask(updatedTask)
            tasks[taskToEditIndex] = updatedTask
        } else {
            responseData = await createTask(taskData)
            if (responseData && responseData.id) {
                tasks.push(responseData)
            }
        }

        updateTaskList(tasks)
        taskForm.reset()
        taskModal.style.display = 'none'
        window.location.reload()
    } catch (error) {
        console.error('Erro ao enviar a tarefa:', error)
        errorMessageDiv.textContent = 'Erro ao enviar a tarefa. Por favor, tente novamente.'
        errorMessageDiv.style.display = 'block'
    }
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
    document.getElementById('taskName').focus()
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