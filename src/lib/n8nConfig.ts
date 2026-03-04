import { createSupabaseAdminClient } from './supabase/admin';

export interface TeamN8nConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export interface Template {
  id: string;
  name: string;
  workflow: any; // n8n workflow JSON structure
}

/**
 * Fetches n8n configuration for a team from vps_instances table
 * @param teamId - The team ID to get n8n config for
 * @returns TeamN8nConfig object or null if not found/not configured
 */
export async function getTeamN8nConfig(teamId: string): Promise<TeamN8nConfig | null> {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from('vps_instances')
    .select('n8n_base_url, n8n_api_user, n8n_api_password')
    .eq('team_id', teamId)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if all required fields are present
  if (!data.n8n_base_url || !data.n8n_api_user || !data.n8n_api_password) {
    return null;
  }

  return {
    baseUrl: data.n8n_base_url, // should already include /rest
    username: data.n8n_api_user,
    password: data.n8n_api_password,
  };
}

/**
 * Fetches a template from the templates table by ID
 * @param templateId - The template ID to fetch
 * @returns Template object or null if not found
 */
export async function getTemplateById(templateId: string): Promise<Template | null> {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from('templates')
    .select('id, name, workflow_json')
    .eq('id', templateId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    workflow: data.workflow_json, // { nodes, connections, settings, ... }
  };
}

/**
 * Validates that a workflow JSON has the required structure
 * @param workflow - The workflow JSON to validate
 * @returns true if valid, false otherwise
 */
export function validateWorkflowJSON(workflow: any): boolean {
  if (!workflow || typeof workflow !== 'object') {
    return false;
  }

  // Check for required n8n workflow structure
  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    return false;
  }

  if (!workflow.connections || typeof workflow.connections !== 'object') {
    return false;
  }

  return true;
}

