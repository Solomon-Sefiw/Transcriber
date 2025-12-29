
import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Grid, IconButton, 
  Tooltip, TextField, InputAdornment, Table, 
  TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Chip, Stack, CircularProgress, Alert
} from '@mui/material';
import { 
  Search as SearchIcon,
  Visibility as ViewIcon,
  Description as DocIcon,
  CalendarMonth as DateIcon,
  Person as UserIcon
} from '@mui/icons-material';
import { User, JudicialRecord } from '../types';
import { apiService } from '../services/apiService';
import { exportToDoc } from '../utils/exportUtils';

interface ArchivesProps {
  user: User;
}

const JudicialArchives: React.FC<ArchivesProps> = ({ user }) => {
  const [records, setRecords] = useState<JudicialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const data = await apiService.getMyRecords(user);
        setRecords(data);
      } catch (e) {
        console.error("Failed to fetch archives");
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [user]);

  const filtered = records.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase()) || 
    r.transcript.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <Box sx={{ py: 10, textAlign: 'center' }}>
      <CircularProgress color="secondary" />
      <Typography variant="body2" sx={{ mt: 2, fontWeight: 900, color: 'primary.main' }}>ACCESSING SECURE DATA VAULT...</Typography>
    </Box>
  );

  return (
    <Stack spacing={4}>
      <Alert severity={user.role === 'Clerk' ? 'info' : 'warning'} variant="outlined" sx={{ borderRadius: 4 }}>
        {user.role === 'Clerk' 
          ? `Showing your personal judicial records. Only you can access these documents.`
          : `Judicial Oversight Mode: You have permission to view records from all transcribers.`}
      </Alert>

      <Paper sx={{ p: 4, borderRadius: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search authorized archives..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'grey.100' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>CASE REFERENCE</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>STENOGRAPHER</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>DATE</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>SIZE</TableCell>
              <TableCell sx={{ fontWeight: 900 }} align="right">EXPORTS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((record) => (
              <TableRow key={record.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="800" color="primary.main">{record.title}</Typography>
                  <Typography variant="caption" color="text.secondary">REF: {record.id}</Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <UserIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                    <Typography variant="caption" fontWeight="bold">
                      {record.ownerId === user.id ? "Me" : record.ownerId}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <DateIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    <Typography variant="caption">{new Date(record.createdAt).toLocaleDateString()}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip label={record.fileSize} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {/* Fix: Explicitly pass children prop to Tooltip to resolve compilation error */}
                    <Tooltip title="View Plain Text" children={
                      <IconButton size="small" color="primary"><ViewIcon /></IconButton>
                    } />
                    {/* Fix: Explicitly pass children prop to Tooltip to resolve compilation error */}
                    <Tooltip title="Export DOC" children={
                      <IconButton color="primary" size="small" onClick={() => exportToDoc(record.transcript, record.title)}>
                        <DocIcon />
                      </IconButton>
                    } />
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 12 }}>
                  <Typography variant="body2" color="text.disabled" fontWeight="bold">No records found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

export default JudicialArchives;
