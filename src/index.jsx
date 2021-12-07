/*** SCHEMA ***/
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
} from "graphql";

const PreferenceType = new GraphQLObjectType({
  name: "Preference",
  fields: {
    like: { type: GraphQLString },
    dislike: { type: GraphQLString },
  },
});

const PersonType = new GraphQLObjectType({
  name: "Person",
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    age: { type: GraphQLInt },
    preference: { type: PreferenceType },
  },
});

const peopleData = [
  {
    id: 1,
    name: "John Smith",
    age: 25,
    preference: {
      like: "food",
      dislike: "car",
    },
  },
  {
    id: 2,
    name: "Sara Smith",
    age: 30,
    preference: {
      like: "car",
      dislike: "apple",
    },
  },
  {
    id: 3,
    name: "Budd Deey",
    age: 41,
    preference: {
      like: "computer",
      dislike: "tree",
    },
  },
];

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    people: {
      type: new GraphQLList(PersonType),
      resolve: () => peopleData,
    },
  },
});

const MutationType = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    addPerson: {
      type: PersonType,
      args: {
        name: { type: GraphQLString },
        age: { type: GraphQLInt },
      },
      resolve: function (_, { name, age }) {
        const person = {
          id: peopleData[peopleData.length - 1].id + 1,
          name,
          age,
        };

        peopleData.push(person);
        return person;
      },
    },
  },
});

const schema = new GraphQLSchema({ query: QueryType, mutation: MutationType });

/*** LINK ***/
import { graphql, print } from "graphql";
import { ApolloLink, Observable } from "@apollo/client";
function delay(wait) {
  return new Promise((resolve) => setTimeout(resolve, wait));
}

const link = new ApolloLink((operation) => {
  return new Observable(async (observer) => {
    const { query, operationName, variables } = operation;
    await delay(300);
    try {
      const result = await graphql({
        schema,
        source: print(query),
        variableValues: variables,
        operationName,
      });
      observer.next(result);
      observer.complete();
    } catch (err) {
      observer.error(err);
    }
  });
});

/*** APP ***/
import React, { useState } from "react";
import { render } from "react-dom";
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  gql,
  useQuery,
  useLazyQuery,
  useMutation,
} from "@apollo/client";
import "./index.css";
import { BrowserRouter, Routes, Route, Link, Outlet } from "react-router-dom";

export const PEOPLE_NAME_FRAGMENT = gql`
  fragment PeopleName on Person {
    id
    name
  }
`;

export const PEOPLE_NAME_AGE_FRAGMENT = gql`
  fragment PeopleNameAge on Person {
    id
    name
    age
    preference {
      like
      dislike
    }
  }
`;

const ALL_PEOPLE_NAME = gql`
  query AllPeople {
    people {
      ...PeopleName
    }
  }
  ${PEOPLE_NAME_FRAGMENT}
`;

const ALL_PEOPLE_NAME_AGE = gql`
  query AllPeople {
    people {
      ...PeopleNameAge
    }
  }
  ${PEOPLE_NAME_AGE_FRAGMENT}
`;

const ADD_PERSON = gql`
  mutation AddPerson($name: String, $age: Int) {
    addPerson(name: $name, age: $age) {
      id
      name
      age
    }
  }
`;

function AllPeopleName() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const { loading: allPeopleNameLoading, data: allPeopeNameData } = useQuery(
    ALL_PEOPLE_NAME,
    {
      fetchPolicy: "network-only",
      nextFetchPolicy: "cache-and-network",
    }
  );

  const [addPerson] = useMutation(ADD_PERSON, {
    update: (cache, { data: { addPerson: addPersonData } }) => {
      const peopleResult = cache.readQuery({ query: ALL_PEOPLE_NAME });

      cache.writeQuery({
        query: ALL_PEOPLE_NAME,
        data: {
          ...peopleResult,
          people: [...peopleResult.people, addPersonData],
        },
      });
    },
  });

  return (
    <main>
      <h1>Apollo Client Issue Reproduction</h1>
      <p>
        This application can be used to demonstrate an error in Apollo Client.
      </p>
      {/* <div className="add-person">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          name="name"
          value={name}
          required
          onChange={(evt) => setName(evt.target.value)}
        />
        <label htmlFor="age">Age</label>
        <input
          type="number"
          name="age"
          value={age}
          required
          onChange={(evt) => setAge(evt.target.value)}
        />
        <button
          onClick={() => {
            if (name && age) {
              addPerson({ variables: { name, age: parseInt(age) } });
              setName("");
              setAge("");
            }
          }}
        >
          Add person
        </button>
      </div> */}

      <h2>All people name</h2>
      {allPeopleNameLoading ? (
        <p>Loading…</p>
      ) : (
        <ul>
          {allPeopeNameData?.people.map((person) => (
            <li key={person.id}>{person.name}</li>
          ))}
        </ul>
      )}
    </main>
  );
}

function AllPeopleNameAge() {
  const { data: allPeopeNameAgeData } = useQuery(ALL_PEOPLE_NAME_AGE, {
    fetchPolicy: "cache-and-network",
    // nextFetchPolicy: "cache-and-network",
  });

  console.log(allPeopeNameAgeData);

  return (
    <main>
      <h1>Apollo Client Issue Reproduction</h1>
      <p>
        This application can be used to demonstrate an error in Apollo Client.
      </p>

      <h2>All people name age</h2>
      {
        <ul>
          {allPeopeNameAgeData?.people.map((person) => (
            <li key={person.id}>
              {person.name} - {person.age} - {person.preference.like} -{" "}
              {person.preference.dislike}
            </li>
          ))}
        </ul>
      }
    </main>
  );
}

function App() {
  return (
    <div>
      <h1>Menu</h1>
      <nav>
        <Link to="/">Home</Link> |{" "}
        <Link to="/allPeopleNameAge">All people name age</Link>
      </nav>
      <Routes>
        <Route path="/" element={<AllPeopleName />} />
        <Route path="allPeopleNameAge" element={<AllPeopleNameAge />} />
      </Routes>
    </div>
  );
}

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
});

render(
  <ApolloProvider client={client}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ApolloProvider>,
  document.getElementById("root")
);
