import { useState, type SyntheticEvent } from 'react'
import { DialogActions, Field, TextArea, TextInput } from '../../components/ui/FormControls'
import { Modal } from '../../components/ui/Modal'
import type { Project } from '../../domain/blueprint'
import { useWorkspaceStore } from '../../store/workspaceStore'

const cloudOptions = ['Sales Cloud', 'Service Cloud', 'Financial Services Cloud', 'Data Cloud']

export function ProjectDialog({ project, onClose }: { project?: Project; onClose: () => void }) {
  const createProject = useWorkspaceStore((state) => state.createProject)
  const updateProject = useWorkspaceStore((state) => state.updateProject)
  const status = useWorkspaceStore((state) => state.status)
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [clouds, setClouds] = useState<string[]>(project?.clouds ?? [])
  const saving = status === 'saving'

  const submit = async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault()
    if (!name.trim()) return
    if (project) await updateProject({ name, description, clouds })
    else await createProject({ name, description, clouds })
    if (useWorkspaceStore.getState().status === 'ready') onClose()
  }

  const toggleCloud = (cloud: string) => {
    setClouds((current) =>
      current.includes(cloud) ? current.filter((value) => value !== cloud) : [...current, cloud],
    )
  }

  return (
    <Modal
      title={project ? 'Edit project details' : 'Create a Blueprint project'}
      description={
        project
          ? 'Keep the project context current for everyone reviewing the design.'
          : 'Give this initiative a clear home. You can refine these details later.'
      }
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="space-y-5 px-6 py-5">
          <Field label="Project name">
            <TextInput
              autoFocus
              required
              maxLength={120}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
              }}
              placeholder="Commercial Lending Transformation"
            />
          </Field>
          <Field label="Description" hint="Optional">
            <TextArea
              rows={3}
              maxLength={500}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value)
              }}
              placeholder="What outcome is this project working toward?"
            />
          </Field>
          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">Salesforce clouds</legend>
            <p className="mt-1 text-xs text-slate-500">Choose any that are already in scope.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {cloudOptions.map((cloud) => (
                <label
                  key={cloud}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm hover:border-blue-300 hover:bg-blue-50"
                >
                  <input
                    type="checkbox"
                    checked={clouds.includes(cloud)}
                    onChange={() => {
                      toggleCloud(cloud)
                    }}
                    className="size-4 accent-blue-700"
                  />
                  {cloud}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <DialogActions>
          <button type="button" className="button-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="button-primary" disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : project ? 'Save changes' : 'Create project'}
          </button>
        </DialogActions>
      </form>
    </Modal>
  )
}

export function CreateProjectDialog({ onClose }: { onClose: () => void }) {
  return <ProjectDialog onClose={onClose} />
}
