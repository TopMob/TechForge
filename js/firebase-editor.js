import { loadComponentsFromFirebase, loadComponentFromFirebase, saveComponent, deleteComponent } from './firebase.js'
import { collectFirebasePayload, fillFirebaseFormByComponent, renderFirebaseCategoryFields } from './firebase-form.js'

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function setupFirebaseEditor({
  formElement,
  specsContainer,
  requiredHint,
  statusElement,
  editorCategorySelect,
  editorComponentSelect,
  refreshAfterSave,
  refreshCatalog
}) {
  const state = {
    selectedCategory: '',
    selectedComponentName: ''
  }

  function setStatus(message) {
    if (statusElement) statusElement.textContent = message
  }

  function getCurrentCategory() {
    return normalizeText(formElement.elements.firebaseCategory.value)
  }

  function renderFormByCategory(categoryKey) {
    renderFirebaseCategoryFields(specsContainer, requiredHint, categoryKey)
  }

  function syncCategorySelectors(categoryKey) {
    if (editorCategorySelect.value !== categoryKey) editorCategorySelect.value = categoryKey
    if (formElement.elements.firebaseCategory.value !== categoryKey) {
      formElement.elements.firebaseCategory.value = categoryKey
      renderFormByCategory(categoryKey)
    }
    state.selectedCategory = categoryKey
  }

  async function loadEditorComponentList(categoryKey) {
    state.selectedCategory = categoryKey
    state.selectedComponentName = ''
    editorComponentSelect.innerHTML = '<option value="">Загрузка...</option>'

    const components = await loadComponentsFromFirebase(categoryKey)
    components.sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name), 'ru'))

    editorComponentSelect.innerHTML = [
      '<option value="">Выберите компонент</option>',
      ...components.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`)
    ].join('')
  }

  async function handleLoadToForm() {
    const category = normalizeText(editorCategorySelect.value)
    const componentName = normalizeText(editorComponentSelect.value)
    if (!category || !componentName) {
      setStatus('Выберите категорию и компонент для загрузки.')
      return
    }

    syncCategorySelectors(category)

    const componentRecord = await loadComponentFromFirebase(category, componentName)
    if (!componentRecord) {
      setStatus('Компонент не найден в Firebase.')
      return
    }

    fillFirebaseFormByComponent(formElement, category, componentRecord)
    state.selectedComponentName = componentName
    setStatus(`Данные загружены в форму: ${componentName}`)
  }

  async function handleUpdateFromForm() {
    const category = getCurrentCategory()
    const { errors, payload } = collectFirebasePayload(formElement, category)

    if (errors.length > 0) {
      setStatus(errors[0])
      return
    }

    if (!payload?.name || !payload?.price) {
      setStatus('Заполните название, модель и цену.')
      return
    }

    await saveComponent(category, payload)
    await refreshCatalog(category, payload)
    await loadEditorComponentList(category)
    editorComponentSelect.value = payload.name
    state.selectedComponentName = payload.name
    refreshAfterSave()
    setStatus(`Компонент обновлён: ${payload.name}`)
  }

  async function handleDelete() {
    const category = normalizeText(editorCategorySelect.value)
    const componentName = normalizeText(editorComponentSelect.value)
    if (!category || !componentName) {
      setStatus('Выберите компонент для удаления.')
      return
    }

    await deleteComponent(category, componentName)
    await refreshCatalog(category)
    await loadEditorComponentList(category)
    if (normalizeText(formElement.elements.firebaseComponentName.value) === componentName) {
      formElement.reset()
      formElement.elements.firebaseCategory.value = category
      renderFormByCategory(category)
    }
    refreshAfterSave()
    setStatus(`Компонент удалён: ${componentName}`)
  }

  async function initialize(initialCategory) {
    syncCategorySelectors(initialCategory)
    await loadEditorComponentList(initialCategory)

    editorCategorySelect.addEventListener('change', async () => {
      const category = normalizeText(editorCategorySelect.value)
      syncCategorySelectors(category)
      await loadEditorComponentList(category)
      setStatus('')
    })

    editorComponentSelect.addEventListener('change', () => {
      state.selectedComponentName = normalizeText(editorComponentSelect.value)
      setStatus('')
    })

    return {
      loadToForm: handleLoadToForm,
      updateFromForm: handleUpdateFromForm,
      deleteFromFirebase: handleDelete,
      refresh: async () => loadEditorComponentList(normalizeText(editorCategorySelect.value))
    }
  }

  return { initialize }
}
