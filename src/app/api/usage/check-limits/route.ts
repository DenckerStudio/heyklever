import { NextRequest, NextResponse } from 'next/server';
import { usageLimitService } from '@/lib/usage-limits';

export const runtime = 'nodejs';

/**
 * Check usage limits for a team
 * 
 * GET /api/usage/check-limits?teamId=...&estimatedTokens=...
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const teamId = searchParams.get('teamId');
  const estimatedTokens = parseInt(searchParams.get('estimatedTokens') || '0');

  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }

  try {
    const result = await usageLimitService.checkLimits(teamId, estimatedTokens);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Check limits error:', error);
    return NextResponse.json(
      { error: 'Failed to check limits' },
      { status: 500 }
    );
  }
}

