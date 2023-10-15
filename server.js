const express = require('express');
const crypto = require('crypto');
const Contact = require('./model');
const { createCipheriv, createDecipheriv, randomBytes } = require('crypto');

const passphrase = 'SecurePassphrase123!';

const key = crypto.scryptSync(passphrase, 'salt', 32).toString('hex');

const app = express();
app.use(express.json());

function encrypt(text, key) {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + encrypted;
}

function decrypt(text, key) {
  if (!text) {
    return null;
  }
  const iv = Buffer.from(text.slice(0, 32), 'hex');
  const encryptedText = text.slice(32);
  const decipher = createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

app.post('/contacts', async (req, res) => {
  try {
    const { firstName, secondName, thirdName, phoneNumber } = req.body;

    const contact = JSON.stringify({
      firstName,
      secondName,
      thirdName,
      phoneNumber,
    });

    const encryptedContact = encrypt(contact, key);

    const newContact = await Contact.create({
      fullContacts: encryptedContact,
    });

    res.json({ message: 'Contact added', id: newContact.contact_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/contacts', async (req, res) => {
  try {
    const contacts = await Contact.findAll();
    const decryptedContacts = contacts.map(contact => {
      const decryptedContact = decrypt(contact.fullContacts, key);
      const parsedContact = JSON.parse(decryptedContact);
      parsedContact.id = contact.contact_id;
      return parsedContact;
    });
    res.json(decryptedContacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/contacts/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const contact = await Contact.findByPk(id);

    if (!contact) {
      return res.status(404).json({ error: 'contact not found' });
    }

    /*   Decrypt the contact details */
    const decryptedContact = decrypt(contact.fullContacts, key);
    const parsedContact = JSON.parse(decryptedContact);

    res.json(parsedContact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'failed to fetch contact' });
  }
});


app.put('/contacts/:id', async (req, res) => {
  const id = req.params.id;
  const { firstName, secondName, thirdName, phoneNumber } = req.body;

  try {
    const existingContact = await Contact.findByPk(id);

    if (!existingContact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    /*   Decrypt the existing contact details */
    const decryptedContact = decrypt(existingContact.fullContacts, key);
    const parsedContact = JSON.parse(decryptedContact);

    /* Update the contact details */
    parsedContact.firstName = firstName;
    parsedContact.secondName = secondName;
    parsedContact.thirdName = thirdName;
    parsedContact.phoneNumber = phoneNumber;

    /* Encrypt the updated contact details */
    const updatedContact = encrypt(JSON.stringify(parsedContact), key);

    /* Update the existing contact with the new encrypted details */
    await existingContact.update({ fullContacts: updatedContact });

    res.json({ message: 'Contact updated', id: id });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});


app.delete('/contacts/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const existingContact = await Contact.findByPk(id);

    if (!existingContact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await existingContact.destroy();

    res.json({ message: 'Contact deleted', id: id });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
