// Ideen-Manager Klasse
class IdeaManager {
    constructor() {
        this.ideas = this.loadIdeas();
        this.currentEditId = null;
        this.currentRating = 0;
        this.init();
    }

    // Initialisierung
    init() {
        this.setupEventListeners();
        this.renderIdeas();
        this.updateStats();
    }

    // Event Listeners einrichten
    setupEventListeners() {
        // Form Submit
        document.getElementById('ideaForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveIdea();
        });

        // Stern-Bewertung
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

        // Filter und Sortierung
        document.getElementById('filterCategory').addEventListener('change', () => {
            this.renderIdeas();
        });

        document.getElementById('sortBy').addEventListener('change', () => {
            this.renderIdeas();
        });

        // Abbrechen Button
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.cancelEdit();
        });
    }

    // Ideen aus localStorage laden
    loadIdeas() {
        const stored = localStorage.getItem('ideas');
        return stored ? JSON.parse(stored) : [];
    }

    // Ideen in localStorage speichern
    saveToStorage() {
        localStorage.setItem('ideas', JSON.stringify(this.ideas));
    }

    // Stern-Bewertung setzen
    setRating(rating) {
        this.currentRating = rating;
        document.getElementById('ideaRating').value = rating;
        this.highlightStars(rating);
    }

    // Sterne visuell hervorheben
    highlightStars(rating) {
        const stars = document.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.textContent = '★';
                star.classList.add('active');
            } else {
                star.textContent = '☆';
                star.classList.remove('active');
            }
        });
    }

    // Neue Idee speichern oder bestehende aktualisieren
    saveIdea() {
        const title = document.getElementById('ideaTitle').value.trim();
        const description = document.getElementById('ideaDescription').value.trim();
        const category = document.getElementById('ideaCategory').value;
        const priority = document.getElementById('ideaPriority').value;
        const rating = parseInt(document.getElementById('ideaRating').value) || 0;

        if (!title || !description) {
            alert('Bitte fülle alle Pflichtfelder aus!');
            return;
        }

        if (this.currentEditId !== null) {
            // Bestehende Idee aktualisieren
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
            // Neue Idee erstellen
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

    // Idee bearbeiten
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

        // Zum Formular scrollen
        document.querySelector('.add-idea-section').scrollIntoView({ behavior: 'smooth' });
    }

    // Bearbeitung abbrechen
    cancelEdit() {
        this.currentEditId = null;
        this.resetForm();
    }

    // Idee löschen
    deleteIdea(id) {
        if (confirm('Möchtest du diese Idee wirklich löschen?')) {
            this.ideas = this.ideas.filter(i => i.id !== id);
            this.saveToStorage();
            this.renderIdeas();
            this.updateStats();
        }
    }

    // Formular zurücksetzen
    resetForm() {
        document.getElementById('ideaForm').reset();
        this.setRating(0);
        this.currentEditId = null;
        document.getElementById('submitBtn').querySelector('#btnText').textContent = 'Idee speichern';
        document.getElementById('cancelBtn').style.display = 'none';
    }

    // Ideen filtern und sortieren
    getFilteredAndSortedIdeas() {
        let filtered = [...this.ideas];

        // Filtern nach Kategorie
        const filterCategory = document.getElementById('filterCategory').value;
        if (filterCategory !== 'alle') {
            filtered = filtered.filter(idea => idea.category === filterCategory);
        }

        // Sortieren
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

    // Ideen rendern
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

        // Event Listeners für Aktionen
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

    // Einzelne Ideenkarte erstellen
    createIdeaCard(idea) {
        const date = new Date(idea.createdAt);
        const formattedDate = date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const stars = '★'.repeat(idea.rating) + '☆'.repeat(5 - idea.rating);

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
                    <button class="btn btn-delete" data-id="${idea.id}">Löschen</button>
                </div>
            </div>
        `;
    }

    // HTML escapen für Sicherheit
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Statistiken aktualisieren
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

// App starten wenn DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
    new IdeaManager();
});
