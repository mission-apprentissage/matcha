import Axios from 'axios'

const API = Axios.create({
  baseURL: process.env.REACT_APP_BASE_URL,
})

const errorHandler = (error) => {
  if (error.response && error.response.data) {
    console.log("Erreur de l'API :", error)
  }
}

export const getFormulaire = (formId) => API.get(`/formulaire/${formId}`).catch(errorHandler)

export const postFormulaire = (form) => API.post(`/formulaire`, form).catch(errorHandler)

export const putFormulaire = (formId, form) => API.put(`/formulaire/${formId}`, form).catch(errorHandler)

export const postOffre = (formId, offre) => API.post(`/formulaire/${formId}/offre`, offre).catch(errorHandler)

export const putOffre = (offreId, offre) => API.put(`/formulaire/offre/${offreId}`, offre).catch(errorHandler)

export const getWithQS = (payload) =>
  API.get('/formulaire', { params: { query: JSON.stringify(payload.query), ...payload } })

export const getSiretInfo = async (siret) => await API.get(`/entreprise/${siret}`).catch(errorHandler)
