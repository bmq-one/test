// ==================== Tab Navigation ====================
class TabController {
    constructor() {
        this.setupTabs();
    }

    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('tab-' + tabId).classList.add('active');
            });
        });
    }
}

// ==================== Ideen-Manager ====================
class IdeaManager {
    constructor() {
        this.ideas = this.loadIdeas();
        this.currentEditId = null;
        this.currentRating = 0;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderIdeas();
        this.updateStats();
    }

    setupEventListeners() {
        document.getElementById('ideaForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveIdea();
        });

        const stars = document.querySelectorAll('.star');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                this.setRating(parseInt(star.dataset.rating));
            });
            star.addEventListener('mouseenter', () => {
                this.highlightStars(parseInt(star.dataset.rating));
            });
        });

        document.getElementById('starRating').addEventListener('mouseleave', () => {
            this.highlightStars(this.currentRating);
        });

        document.getElementById('filterCategory').addEventListener('change', () => {
            this.renderIdeas();
        });

        document.getElementById('sortBy').addEventListener('change', () => {
            this.renderIdeas();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.cancelEdit();
        });
    }

    loadIdeas() {
        const stored = localStorage.getItem('ideas');
        return stored ? JSON.parse(stored) : [];
    }

    saveToStorage() {
        localStorage.setItem('ideas', JSON.stringify(this.ideas));
    }

    setRating(rating) {
        this.currentRating = rating;
        document.getElementById('ideaRating').value = rating;
        this.highlightStars(rating);
    }

    highlightStars(rating) {
        const stars = document.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.textContent = '\u2605';
                star.classList.add('active');
            } else {
                star.textContent = '\u2606';
                star.classList.remove('active');
            }
        });
    }

    saveIdea() {
        const title = document.getElementById('ideaTitle').value.trim();
        const description = document.getElementById('ideaDescription').value.trim();
        const category = document.getElementById('ideaCategory').value;
        const priority = document.getElementById('ideaPriority').value;
        const rating = parseInt(document.getElementById('ideaRating').value) || 0;

        if (!title || !description) {
            alert('Bitte fuelle alle Pflichtfelder aus!');
            return;
        }

        if (this.currentEditId !== null) {
            const idea = this.ideas.find(i => i.id === this.currentEditId);
            if (idea) {
                idea.title = title;
                idea.description = description;
                idea.category = category;
                idea.priority = priority;
                idea.rating = rating;
                idea.updatedAt = new Date().toISOString();
            }
            this.currentEditId = null;
        } else {
            const idea = {
                id: Date.now(),
                title,
                description,
                category,
                priority,
                rating,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.ideas.push(idea);
        }

        this.saveToStorage();
        this.resetForm();
        this.renderIdeas();
        this.updateStats();
    }

    editIdea(id) {
        const idea = this.ideas.find(i => i.id === id);
        if (!idea) return;

        this.currentEditId = id;
        document.getElementById('ideaTitle').value = idea.title;
        document.getElementById('ideaDescription').value = idea.description;
        document.getElementById('ideaCategory').value = idea.category;
        document.getElementById('ideaPriority').value = idea.priority;
        this.setRating(idea.rating);

        document.getElementById('submitBtn').querySelector('#btnText').textContent = 'Idee aktualisieren';
        document.getElementById('cancelBtn').style.display = 'inline-block';
        document.querySelector('.add-idea-section').scrollIntoView({ behavior: 'smooth' });
    }

    cancelEdit() {
        this.currentEditId = null;
        this.resetForm();
    }

    deleteIdea(id) {
        if (confirm('Moechtest du diese Idee wirklich loeschen?')) {
            this.ideas = this.ideas.filter(i => i.id !== id);
            this.saveToStorage();
            this.renderIdeas();
            this.updateStats();
        }
    }

    resetForm() {
        document.getElementById('ideaForm').reset();
        this.setRating(0);
        this.currentEditId = null;
        document.getElementById('submitBtn').querySelector('#btnText').textContent = 'Idee speichern';
        document.getElementById('cancelBtn').style.display = 'none';
    }

    getFilteredAndSortedIdeas() {
        let filtered = [...this.ideas];

        const filterCategory = document.getElementById('filterCategory').value;
        if (filterCategory !== 'alle') {
            filtered = filtered.filter(idea => idea.category === filterCategory);
        }

        const sortBy = document.getElementById('sortBy').value;
        switch (sortBy) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'oldest':
                filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'rating':
                filtered.sort((a, b) => b.rating - a.rating);
                break;
            case 'priority':
                const priorityOrder = { 'hoch': 3, 'mittel': 2, 'niedrig': 1 };
                filtered.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
                break;
        }

        return filtered;
    }

    renderIdeas() {
        const container = document.getElementById('ideasContainer');
        const emptyState = document.getElementById('emptyState');
        const ideas = this.getFilteredAndSortedIdeas();

        if (ideas.length === 0) {
            container.innerHTML = '';
            emptyState.classList.add('show');
            return;
        }

        emptyState.classList.remove('show');
        container.innerHTML = ideas.map(idea => this.createIdeaCard(idea)).join('');

        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                this.editIdea(parseInt(btn.dataset.id));
            });
        });

        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deleteIdea(parseInt(btn.dataset.id));
            });
        });
    }

    createIdeaCard(idea) {
        const date = new Date(idea.createdAt);
        const formattedDate = date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const stars = '\u2605'.repeat(idea.rating) + '\u2606'.repeat(5 - idea.rating);

        return `
            <div class="idea-card">
                <div class="idea-header">
                    <h3 class="idea-title">${this.escapeHtml(idea.title)}</h3>
                </div>
                <div class="idea-meta">
                    <span class="badge badge-category">${this.escapeHtml(idea.category)}</span>
                    <span class="badge badge-priority ${idea.priority}">${this.escapeHtml(idea.priority)}</span>
                </div>
                <div class="idea-rating">${stars}</div>
                <p class="idea-description">${this.escapeHtml(idea.description)}</p>
                <div class="idea-date">Erstellt am: ${formattedDate}</div>
                <div class="idea-actions">
                    <button class="btn btn-edit" data-id="${idea.id}">Bearbeiten</button>
                    <button class="btn btn-delete" data-id="${idea.id}">Loeschen</button>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStats() {
        const total = this.ideas.length;
        const highPriority = this.ideas.filter(i => i.priority === 'hoch').length;
        const avgRating = total > 0
            ? (this.ideas.reduce((sum, i) => sum + i.rating, 0) / total).toFixed(1)
            : '0.0';

        document.getElementById('totalIdeas').textContent = total;
        document.getElementById('highPriorityIdeas').textContent = highPriority;
        document.getElementById('averageRating').textContent = avgRating;
    }
}

// ==================== Projekt-Manager ====================
class ProjectManager {
    constructor() {
        this.projects = this.loadProjects();
        this.currentEditProjectId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderProjects();
        this.updateDashboard();
    }

    setupEventListeners() {
        document.getElementById('projectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProject();
        });

        document.getElementById('projectCancelBtn').addEventListener('click', () => {
            this.cancelEditProject();
        });

        document.getElementById('projectFilter').addEventListener('change', () => {
            this.renderProjects();
        });
    }

    loadProjects() {
        const stored = localStorage.getItem('projects');
        return stored ? JSON.parse(stored) : [];
    }

    saveToStorage() {
        localStorage.setItem('projects', JSON.stringify(this.projects));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Projekt CRUD ---
    saveProject() {
        const name = document.getElementById('projectName').value.trim();
        const description = document.getElementById('projectDescription').value.trim();
        const color = document.getElementById('projectColor').value;
        const deadline = document.getElementById('projectDeadline').value;

        if (!name) {
            alert('Bitte gib einen Projektnamen ein!');
            return;
        }

        if (this.currentEditProjectId !== null) {
            const project = this.projects.find(p => p.id === this.currentEditProjectId);
            if (project) {
                project.name = name;
                project.description = description;
                project.color = color;
                project.deadline = deadline || null;
                project.updatedAt = new Date().toISOString();
            }
            this.currentEditProjectId = null;
        } else {
            const project = {
                id: Date.now(),
                name,
                description,
                color,
                deadline: deadline || null,
                todos: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.projects.push(project);
        }

        this.saveToStorage();
        this.resetProjectForm();
        this.renderProjects();
        this.updateDashboard();
    }

    editProject(id) {
        const project = this.projects.find(p => p.id === id);
        if (!project) return;

        this.currentEditProjectId = id;
        document.getElementById('projectName').value = project.name;
        document.getElementById('projectDescription').value = project.description || '';
        document.getElementById('projectColor').value = project.color;
        document.getElementById('projectDeadline').value = project.deadline || '';

        document.getElementById('projectFormTitle').textContent = 'Projekt bearbeiten';
        document.getElementById('projectBtnText').textContent = 'Projekt aktualisieren';
        document.getElementById('projectCancelBtn').style.display = 'inline-block';

        document.getElementById('tab-projekte').querySelector('.add-idea-section').scrollIntoView({ behavior: 'smooth' });
    }

    cancelEditProject() {
        this.currentEditProjectId = null;
        this.resetProjectForm();
    }

    deleteProject(id) {
        if (confirm('Moechtest du dieses Projekt und alle zugehoerigen Todos wirklich loeschen?')) {
            this.projects = this.projects.filter(p => p.id !== id);
            this.saveToStorage();
            this.renderProjects();
            this.updateDashboard();
        }
    }

    resetProjectForm() {
        document.getElementById('projectForm').reset();
        this.currentEditProjectId = null;
        document.getElementById('projectFormTitle').textContent = 'Neues Projekt erstellen';
        document.getElementById('projectBtnText').textContent = 'Projekt erstellen';
        document.getElementById('projectCancelBtn').style.display = 'none';
    }

    // --- Todo CRUD ---
    addTodo(projectId) {
        const input = document.getElementById('todoInput-' + projectId);
        const deadlineInput = document.getElementById('todoDeadline-' + projectId);
        const priorityInput = document.getElementById('todoPriority-' + projectId);

        const text = input.value.trim();
        if (!text) return;

        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        project.todos.push({
            id: Date.now(),
            text,
            status: 'offen',
            priority: priorityInput.value,
            deadline: deadlineInput.value || null,
            createdAt: new Date().toISOString()
        });

        input.value = '';
        deadlineInput.value = '';
        priorityInput.value = 'mittel';

        this.saveToStorage();
        this.renderProjects();
        this.updateDashboard();
    }

    toggleTodoStatus(projectId, todoId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        const todo = project.todos.find(t => t.id === todoId);
        if (!todo) return;

        const statusCycle = { 'offen': 'in_arbeit', 'in_arbeit': 'erledigt', 'erledigt': 'offen' };
        todo.status = statusCycle[todo.status];

        this.saveToStorage();
        this.renderProjects();
        this.updateDashboard();
    }

    deleteTodo(projectId, todoId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        project.todos = project.todos.filter(t => t.id !== todoId);

        this.saveToStorage();
        this.renderProjects();
        this.updateDashboard();
    }

    // --- Rendering ---
    getProjectProgress(project) {
        if (project.todos.length === 0) return 0;
        const done = project.todos.filter(t => t.status === 'erledigt').length;
        return Math.round((done / project.todos.length) * 100);
    }

    isOverdue(dateString) {
        if (!dateString) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(dateString) < today;
    }

    getFilteredProjects() {
        const filter = document.getElementById('projectFilter').value;
        if (filter === 'aktiv') {
            return this.projects.filter(p => this.getProjectProgress(p) < 100);
        }
        if (filter === 'abgeschlossen') {
            return this.projects.filter(p => p.todos.length > 0 && this.getProjectProgress(p) === 100);
        }
        return [...this.projects];
    }

    renderProjects() {
        const container = document.getElementById('projectsContainer');
        const emptyState = document.getElementById('projectEmptyState');
        const projects = this.getFilteredProjects();

        if (projects.length === 0) {
            container.innerHTML = '';
            emptyState.classList.add('show');
            return;
        }

        emptyState.classList.remove('show');
        container.innerHTML = projects.map(p => this.createProjectCard(p)).join('');

        // Bind all project-level events
        projects.forEach(project => {
            const card = container.querySelector(`[data-project-id="${project.id}"]`);
            if (!card) return;

            // Add todo
            const addBtn = card.querySelector('.btn-add-todo');
            const todoInput = card.querySelector('.todo-input-field');
            if (addBtn) {
                addBtn.addEventListener('click', () => this.addTodo(project.id));
            }
            if (todoInput) {
                todoInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.addTodo(project.id);
                    }
                });
            }

            // Edit/delete project
            const editBtn = card.querySelector('.btn-edit-project');
            if (editBtn) editBtn.addEventListener('click', () => this.editProject(project.id));

            const deleteBtn = card.querySelector('.btn-delete-project');
            if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteProject(project.id));

            // Toggle/delete todos
            card.querySelectorAll('.todo-status-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.toggleTodoStatus(project.id, parseInt(btn.dataset.todoId));
                });
            });

            card.querySelectorAll('.todo-delete-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.deleteTodo(project.id, parseInt(btn.dataset.todoId));
                });
            });

            // Collapsible todo section
            const toggleBtn = card.querySelector('.toggle-todos');
            const todoBody = card.querySelector('.project-todos-body');
            if (toggleBtn && todoBody) {
                toggleBtn.addEventListener('click', () => {
                    todoBody.classList.toggle('collapsed');
                    toggleBtn.textContent = todoBody.classList.contains('collapsed') ? 'Todos anzeigen' : 'Todos verbergen';
                });
            }
        });
    }

    createProjectCard(project) {
        const progress = this.getProjectProgress(project);
        const totalTodos = project.todos.length;
        const doneTodos = project.todos.filter(t => t.status === 'erledigt').length;
        const isComplete = totalTodos > 0 && progress === 100;

        const deadlineHtml = project.deadline
            ? `<span class="project-deadline ${this.isOverdue(project.deadline) && !isComplete ? 'overdue' : ''}">Deadline: ${new Date(project.deadline).toLocaleDateString('de-DE')}</span>`
            : '';

        const priorityOrder = { 'hoch': 3, 'mittel': 2, 'niedrig': 1 };
        const sortedTodos = [...project.todos].sort((a, b) => {
            if (a.status === 'erledigt' && b.status !== 'erledigt') return 1;
            if (a.status !== 'erledigt' && b.status === 'erledigt') return -1;
            return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        });

        const todosHtml = sortedTodos.map(todo => {
            const statusLabels = { 'offen': 'Offen', 'in_arbeit': 'In Arbeit', 'erledigt': 'Erledigt' };
            const todoDeadline = todo.deadline
                ? `<span class="todo-deadline ${this.isOverdue(todo.deadline) && todo.status !== 'erledigt' ? 'overdue' : ''}">${new Date(todo.deadline).toLocaleDateString('de-DE')}</span>`
                : '';

            return `
                <div class="todo-item todo-${todo.status}">
                    <button class="todo-status-btn status-${todo.status}" data-todo-id="${todo.id}" title="Status aendern">
                        ${todo.status === 'erledigt' ? '&#10003;' : todo.status === 'in_arbeit' ? '&#9654;' : '&#9675;'}
                    </button>
                    <div class="todo-content">
                        <span class="todo-text">${this.escapeHtml(todo.text)}</span>
                        <div class="todo-meta">
                            <span class="todo-status-label status-${todo.status}">${statusLabels[todo.status]}</span>
                            <span class="badge badge-priority ${todo.priority}">${this.escapeHtml(todo.priority)}</span>
                            ${todoDeadline}
                        </div>
                    </div>
                    <button class="todo-delete-btn" data-todo-id="${todo.id}" title="Todo loeschen">&times;</button>
                </div>
            `;
        }).join('');

        return `
            <div class="project-card ${isComplete ? 'project-complete' : ''}" data-project-id="${project.id}" style="border-left-color: ${project.color}">
                <div class="project-header">
                    <div class="project-title-row">
                        <span class="project-color-dot" style="background: ${project.color}"></span>
                        <h3 class="project-title">${this.escapeHtml(project.name)}</h3>
                        ${isComplete ? '<span class="badge badge-complete">Abgeschlossen</span>' : ''}
                    </div>
                    <div class="project-actions">
                        <button class="btn btn-sm btn-edit-project" title="Bearbeiten">Bearbeiten</button>
                        <button class="btn btn-sm btn-delete-project" title="Loeschen">Loeschen</button>
                    </div>
                </div>

                ${project.description ? `<p class="project-description">${this.escapeHtml(project.description)}</p>` : ''}
                ${deadlineHtml}

                <div class="progress-section">
                    <div class="progress-header">
                        <span class="progress-label">Fortschritt</span>
                        <span class="progress-value">${doneTodos}/${totalTodos} (${progress}%)</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%; background: ${project.color}"></div>
                    </div>
                </div>

                <div class="project-todos">
                    <div class="project-todos-header">
                        <h4>Todos</h4>
                        <button class="btn btn-sm toggle-todos">Todos verbergen</button>
                    </div>
                    <div class="project-todos-body">
                        <div class="todo-add-row">
                            <input type="text" class="todo-input-field" id="todoInput-${project.id}" placeholder="Neues Todo...">
                            <select id="todoPriority-${project.id}" class="todo-priority-select">
                                <option value="niedrig">Niedrig</option>
                                <option value="mittel" selected>Mittel</option>
                                <option value="hoch">Hoch</option>
                            </select>
                            <input type="date" id="todoDeadline-${project.id}" class="todo-deadline-input">
                            <button class="btn btn-sm btn-primary btn-add-todo">+</button>
                        </div>
                        <div class="todo-list">
                            ${todosHtml || '<p class="no-todos">Noch keine Todos vorhanden.</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Dashboard Stats ---
    updateDashboard() {
        const allTodos = this.projects.flatMap(p => p.todos);
        const completed = allTodos.filter(t => t.status === 'erledigt').length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdue = allTodos.filter(t => t.status !== 'erledigt' && t.deadline && new Date(t.deadline) < today).length;

        document.getElementById('totalProjects').textContent = this.projects.length;
        document.getElementById('totalTodos').textContent = allTodos.length;
        document.getElementById('completedTodos').textContent = completed;
        document.getElementById('overdueTodos').textContent = overdue;
    }
}

// ==================== App starten ====================
document.addEventListener('DOMContentLoaded', () => {
    new TabController();
    new IdeaManager();
    new ProjectManager();
});
