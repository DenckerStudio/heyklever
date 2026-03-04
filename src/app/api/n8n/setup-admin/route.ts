import { NextRequest, NextResponse } from 'next/server';
import { setupN8nAdminAccount } from '@/lib/services/n8n-admin-setup';

export const runtime = 'nodejs';

/**
 * API endpoint to setup n8n admin account after container is ready
 * Can be called by n8n webhook or manually
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      );
    }

    console.log(`Received request to setup n8n admin for team ${teamId}`);

    const result = await setupN8nAdminAccount(teamId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to setup n8n admin account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'n8n admin account setup completed',
      // Don't return password in response for security
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in n8n admin setup API:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check status or trigger setup
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId query parameter is required' },
        { status: 400 }
      );
    }

    console.log(`Received GET request to setup n8n admin for team ${teamId}`);

    const result = await setupN8nAdminAccount(teamId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to setup n8n admin account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'n8n admin account setup completed',
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in n8n admin setup API:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

